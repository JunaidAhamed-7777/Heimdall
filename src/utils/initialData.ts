import { TaskItem } from "../types";

export const INITIAL_MOTIF = "Early morning cognitive focus blocks paired with protected healthcare slots, aiming for thesis submission by Friday morning.";

export const INITIAL_TASKS: TaskItem[] = [
  {
    id: "t1",
    day: "Tuesday",
    time: "14:00 - 17:00",
    task: "Thesis: Outline, structure, and introductory notes",
    duration: "3 hours",
    category: "thesis",
    completed: true,
    description: "Successfully finalized the structural outline and index sections."
  },
  {
    id: "t2",
    day: "Wednesday",
    time: "07:00 - 09:30",
    task: "Thesis: Literature Review & Background",
    duration: "2.5 hours",
    category: "thesis",
    completed: false,
    description: "Draft background research, historical context, and synthesize previous literature."
  },
  {
    id: "t3",
    day: "Wednesday",
    time: "10:00 - 12:00",
    task: "Doctor's Appointment & Travel",
    duration: "2 hours",
    category: "appointment",
    completed: false,
    description: "Medical check-up. Remember to carry health records and handle travel times."
  },
  {
    id: "t4",
    day: "Wednesday",
    time: "13:30 - 16:00",
    task: "Thesis: Methodology & Data",
    duration: "2.5 hours",
    category: "thesis",
    completed: false,
    description: "Detail research design, variables, data sources, and analytic tools used."
  },
  {
    id: "t5",
    day: "Thursday",
    time: "07:00 - 09:30",
    task: "Thesis: Results & Findings",
    duration: "2.5 hours",
    category: "thesis",
    completed: false,
    description: "Write up findings, build summary charts, and organize data grids."
  },
  {
    id: "t6",
    day: "Thursday",
    time: "10:30 - 13:00",
    task: "Thesis: Discussion & Limitations",
    duration: "2.5 hours",
    category: "thesis",
    completed: false,
    description: "Discuss implications of findings and transparently state data limitations."
  },
  {
    id: "t7",
    day: "Thursday",
    time: "14:30 - 16:30",
    task: "Thesis: Conclusion & References",
    duration: "2 hours",
    category: "thesis",
    completed: false,
    description: "Write final concluding wrap-up and structure citations/academic bibliography."
  },
  {
    id: "t8",
    day: "Friday",
    time: "07:00 - 08:30",
    task: "Thesis: Final polish, proofread, and submission",
    duration: "1.5 hours",
    category: "thesis",
    completed: false,
    description: "Perform final edit, proofread for grammatical consistency, compile PDF and submit!"
  },
  {
    id: "t9",
    day: "Friday",
    time: "10:00 - 13:00",
    task: "Presentation: Draft slides and practice delivery",
    duration: "3 hours",
    category: "presentation",
    completed: false,
    description: "Formulate layout slides, write clear notes, and run rehearsal loops."
  }
];
