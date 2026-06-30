import React, { useState, useEffect, useRef } from "react";
import { X, Download, Upload, Cloud, FileSpreadsheet, FileText, Check, AlertCircle, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: any[];
  deadlines: any[];
  connections: { gdrive: boolean; gmail: boolean; calendar: boolean };
  driveToken: string | null;
  onImportSuccess: (importedTasks: any[], importedDeadlines: any[]) => void;
}

export default function ImportExportModal({
  isOpen,
  onClose,
  tasks,
  deadlines,
  connections,
  driveToken,
  onImportSuccess,
}: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Google Drive file list states
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [isDownloadingFromDrive, setIsDownloadingFromDrive] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Esc key close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      setStatusMsg(null);
    }
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Load drive files on import tab if connected
  useEffect(() => {
    if (isOpen && activeTab === "import" && connections.gdrive && driveToken) {
      fetchDriveFiles();
    }
  }, [isOpen, activeTab, connections.gdrive, driveToken]);

  if (!isOpen) return null;

  const fetchDriveFiles = async () => {
    if (!driveToken) return;
    setIsLoadingDriveFiles(true);
    try {
      const query = "mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'text/csv' or name contains '.xlsx' or name contains '.csv'";
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          query
        )}&fields=files(id,name,mimeType,createdTime)&orderBy=modifiedTime desc`,
        {
          headers: {
            Authorization: `Bearer ${driveToken}`,
          },
        }
      );
      if (!res.ok) {
        throw new Error("Failed to retrieve Google Drive files.");
      }
      const data = await res.json();
      setDriveFiles(data.files || []);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Error loading Google Drive files: " + err.message });
    } finally {
      setIsLoadingDriveFiles(false);
    }
  };

  const handleLocalExport = () => {
    try {
      const tasksData = tasks.map((t) => ({
        "Task Name": t.task,
        "Date": t.day,
        "Time": t.time,
        "Duration": t.duration,
        "Category": t.category,
        "Completed": t.completed ? "Yes" : "No",
        "Description": t.description || "",
      }));

      const deadlinesData = deadlines.map((d) => ({
        "Name": d.name,
        "Date": d.date,
      }));

      const wb = XLSX.utils.book_new();
      const wsTasks = XLSX.utils.json_to_sheet(tasksData);
      const wsDeadlines = XLSX.utils.json_to_sheet(deadlinesData);

      XLSX.utils.book_append_sheet(wb, wsTasks, "Tasks");
      XLSX.utils.book_append_sheet(wb, wsDeadlines, "Deadlines");

      XLSX.writeFile(wb, "Heimdall_Timetable.xlsx");
      setStatusMsg({ type: "success", text: "Excel file exported successfully!" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Failed to export: " + err.message });
    }
  };

  const handleDriveUpload = async () => {
    if (!driveToken) return;
    setIsUploadingToDrive(true);
    setStatusMsg(null);
    try {
      const tasksData = tasks.map((t) => ({
        "Task Name": t.task,
        "Date": t.day,
        "Time": t.time,
        "Duration": t.duration,
        "Category": t.category,
        "Completed": t.completed ? "Yes" : "No",
        "Description": t.description || "",
      }));

      const deadlinesData = deadlines.map((d) => ({
        "Name": d.name,
        "Date": d.date,
      }));

      const wb = XLSX.utils.book_new();
      const wsTasks = XLSX.utils.json_to_sheet(tasksData);
      const wsDeadlines = XLSX.utils.json_to_sheet(deadlinesData);

      XLSX.utils.book_append_sheet(wb, wsTasks, "Tasks");
      XLSX.utils.book_append_sheet(wb, wsDeadlines, "Deadlines");

      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const metadata = {
        name: "Heimdall_Timetable.xlsx",
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", blob);

      const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${driveToken}`,
        },
        body: form,
      });

      if (!res.ok) {
        throw new Error("Google Drive upload request failed.");
      }

      setStatusMsg({ type: "success", text: "Timetable uploaded to Google Drive!" });
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Failed to upload to Google Drive: " + err.message });
    } finally {
      setIsUploadingToDrive(false);
    }
  };

  const processWorkbookData = (workbook: XLSX.WorkBook) => {
    const importedTasks: any[] = [];
    const importedDeadlines: any[] = [];

    // Search for sheets containing tasks/deadlines
    const taskSheetName = workbook.SheetNames.find((name) =>
      name.toLowerCase().includes("task")
    );
    const deadlineSheetName = workbook.SheetNames.find((name) =>
      name.toLowerCase().includes("deadline")
    );

    if (taskSheetName) {
      const ws = workbook.Sheets[taskSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      rows.forEach((row, i) => {
        const name = row["Task Name"] || row["task"] || row["Task"] || row["name"] || row["Name"];
        if (name) {
          importedTasks.push({
            id: `task-imported-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            task: String(name),
            day: String(row["Date"] || row["date"] || new Date().toISOString().slice(0, 10)),
            time: String(row["Time"] || row["time"] || "Unscheduled"),
            duration: String(row["Duration"] || row["duration"] || "30m"),
            category: (String(row["Category"] || row["category"] || "general").toLowerCase()) as any,
            completed: String(row["Completed"] || row["completed"]).toLowerCase() === "yes" || !!row["completed"],
            description: String(row["Description"] || row["description"] || ""),
          });
        }
      });
    }

    if (deadlineSheetName) {
      const ws = workbook.Sheets[deadlineSheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      rows.forEach((row, i) => {
        const name = row["Name"] || row["name"] || row["Deadline Name"] || row["Deadline"];
        if (name) {
          importedDeadlines.push({
            id: `deadline-imported-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
            name: String(name),
            date: String(row["Date"] || row["date"] || new Date().toISOString().slice(0, 10)),
          });
        }
      });
    }

    if (importedTasks.length === 0 && importedDeadlines.length === 0) {
      // Try parsing the first sheet as tasks if sheet names did not match
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);
      rows.forEach((row, i) => {
        const name = row["Task Name"] || row["task"] || row["Task"] || row["name"] || row["Name"];
        if (name) {
          importedTasks.push({
            id: `task-imported-${Date.now()}-${i}`,
            task: String(name),
            day: String(row["Date"] || row["date"] || new Date().toISOString().slice(0, 10)),
            time: String(row["Time"] || row["time"] || "Unscheduled"),
            duration: String(row["Duration"] || row["duration"] || "30m"),
            category: "general",
            completed: false,
            description: String(row["Description"] || row["description"] || ""),
          });
        }
      });
    }

    if (importedTasks.length > 0 || importedDeadlines.length > 0) {
      onImportSuccess(importedTasks, importedDeadlines);
      setStatusMsg({
        type: "success",
        text: `Successfully imported ${importedTasks.length} tasks and ${importedDeadlines.length} deadlines! Skipping duplicates.`,
      });
    } else {
      setStatusMsg({
        type: "error",
        text: "No valid tasks or deadlines found in the uploaded file.",
      });
    }
  };

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMsg(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) return;
        const workbook = XLSX.read(data, { type: "binary" });
        processWorkbookData(workbook);
      } catch (err: any) {
        console.error(err);
        setStatusMsg({ type: "error", text: "Failed to parse local file: " + err.message });
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDriveFileImportClick = async (fileId: string, fileName: string) => {
    if (!driveToken) return;
    setIsDownloadingFromDrive(fileId);
    setStatusMsg(null);
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${driveToken}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to download file from Google Drive.");
      }

      const arrayBuffer = await res.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
      processWorkbookData(workbook);
    } catch (err: any) {
      console.error(err);
      setStatusMsg({ type: "error", text: "Failed to import from Google Drive: " + err.message });
    } finally {
      setIsDownloadingFromDrive(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-outline-variant rounded-2xl p-6 md:p-8 max-w-lg w-full mx-4 shadow-2xl relative max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-4">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            <h2 className="font-headline-sm text-on-surface text-lg">
              Import or Export Timetable
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-primary transition-colors p-1 hover:bg-surface-container rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant mb-6">
          <button
            onClick={() => {
              setActiveTab("export");
              setStatusMsg(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold font-label-caps border-b-2 transition-all ${
              activeTab === "export"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Export
          </button>
          <button
            onClick={() => {
              setActiveTab("import");
              setStatusMsg(null);
            }}
            className={`flex-1 py-2.5 text-xs font-bold font-label-caps border-b-2 transition-all ${
              activeTab === "import"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Import
          </button>
        </div>

        {/* Notifications */}
        {statusMsg && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start gap-2.5 text-xs border ${
              statusMsg.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-500"
                : "bg-error/10 border-error/30 text-error"
            }`}
          >
            {statusMsg.type === "success" ? (
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Active Tab Content */}
        <div className="flex-1 space-y-6">
          {activeTab === "export" && (
            <div className="space-y-4">
              <p className="text-xs text-on-surface-variant font-body-md leading-relaxed">
                Backup your schedule and deadlines. You can download them directly to your computer as an Excel file or back them up to your linked Google Drive account.
              </p>

              <div className="grid grid-cols-1 gap-3 pt-2">
                <button
                  onClick={handleLocalExport}
                  className="w-full flex items-center justify-between p-4 bg-surface-container border border-outline-variant hover:border-primary rounded-xl transition-all hover:bg-surface-container-high text-left"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">Download as Excel</h4>
                      <p className="text-[10px] text-on-surface-variant">Save file locally to your machine (.xlsx)</p>
                    </div>
                  </div>
                </button>

                {/* Google Drive Upload */}
                <div className="relative group">
                  <button
                    disabled={!connections.gdrive || isUploadingToDrive}
                    onClick={handleDriveUpload}
                    className={`w-full flex items-center justify-between p-4 bg-surface-container border rounded-xl transition-all text-left ${
                      connections.gdrive
                        ? "border-outline-variant hover:border-primary hover:bg-surface-container-high cursor-pointer"
                        : "border-outline-variant/50 opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isUploadingToDrive ? (
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                      ) : (
                        <Cloud className="w-5 h-5 text-primary" />
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-on-surface">Upload to Google Drive</h4>
                        <p className="text-[10px] text-on-surface-variant">
                          {isUploadingToDrive ? "Uploading file..." : "Backup directly to Google Drive"}
                        </p>
                      </div>
                    </div>
                  </button>

                  {!connections.gdrive && (
                    <div className="absolute left-0 right-0 -top-8 bg-black/90 border border-outline-variant text-[10px] text-primary px-2.5 py-1 rounded shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center">
                      Cannot find linked Google Drive account
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "import" && (
            <div className="space-y-6">
              <p className="text-xs text-on-surface-variant font-body-md leading-relaxed">
                Import tasks and deadlines from a spreadsheet. Duplicate entries will be automatically filtered out.
              </p>

              <div className="space-y-4">
                {/* Computer Upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-between p-4 bg-surface-container border border-outline-variant hover:border-primary rounded-xl transition-all hover:bg-surface-container-high text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-primary" />
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">Upload from Computer</h4>
                      <p className="text-[10px] text-on-surface-variant">Choose local file (.xlsx, .csv)</p>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleLocalUpload}
                    className="hidden"
                  />
                </button>

                {/* Google Drive Import */}
                <div className="border-t border-outline-variant pt-4 space-y-3">
                  <h3 className="font-label-caps text-[11px] text-primary tracking-wider uppercase">
                    Import from Google Drive
                  </h3>

                  {!connections.gdrive ? (
                    <div className="p-4 bg-surface-container/50 border border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center text-center gap-1">
                      <Cloud className="w-6 h-6 text-on-surface-variant/40" />
                      <p className="text-[11px] text-on-surface-variant">
                        Cannot find linked Google Drive account
                      </p>
                    </div>
                  ) : isLoadingDriveFiles ? (
                    <div className="flex flex-col items-center justify-center py-6 gap-2">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                      <p className="text-[10px] text-on-surface-variant">Scanning Google Drive...</p>
                    </div>
                  ) : driveFiles.length === 0 ? (
                    <p className="text-[11px] text-on-surface-variant italic text-center py-2">
                      No Excel or CSV files found in your Google Drive.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
                      {driveFiles.map((file) => {
                        const isDownloading = isDownloadingFromDrive === file.id;
                        return (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3 bg-surface-container border border-outline-variant rounded-lg hover:border-primary/50 transition-all text-left"
                          >
                            <div className="flex items-center gap-2 overflow-hidden max-w-[70%]">
                              <FileSpreadsheet className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="text-xs text-on-surface truncate font-medium">
                                {file.name}
                              </span>
                            </div>
                            <button
                              disabled={!!isDownloadingFromDrive}
                              onClick={() => handleDriveFileImportClick(file.id, file.name)}
                              className="px-2.5 py-1.5 rounded bg-primary hover:bg-primary/90 text-on-primary text-[10px] font-bold font-label-caps transition-all flex items-center gap-1"
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Loading
                                </>
                              ) : (
                                "Import"
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
