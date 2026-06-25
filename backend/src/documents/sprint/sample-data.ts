import { SprintData } from "./config";

export const sprintSampleData: SprintData = {
  sprintName: "24",
  dateStart: "16 Jun",
  dateEnd: "27 Jun 2025",
  weekNumber: "26",
  members: [
    {
      name: "Ana Garcia",
      initials: "AG",
      projects: [
        {
          name: "Plataforma Core",
          issues: [
            {
              title: "Fix login redirect on mobile",
              type: "Bug",
              priority: "Urgent",
              status: "In Progress",
            },
            {
              title: "Add dark mode toggle",
              type: "Feature",
              priority: "Medium",
              status: "In Review",
            },
          ],
        },
        {
          name: "Panel de Admin",
          issues: [
            {
              title: "Optimize dashboard query performance",
              type: "Improvement",
              priority: "High",
              status: "Done",
            },
          ],
        },
      ],
    },
    {
      name: "Carlos Mendez",
      initials: "CM",
      projects: [
        {
          name: "API Gateway",
          issues: [
            {
              title: "Rate limiting per endpoint",
              type: "Feature",
              priority: "High",
              status: "In Progress",
            },
            {
              title: "Memory leak in auth service",
              type: "Bug",
              priority: "Urgent",
              status: "In Progress",
            },
            {
              title: "Improve error response messages",
              type: "Improvement",
              priority: "Low",
              status: "Todo",
            },
          ],
        },
      ],
    },
    {
      name: "Laura Vega",
      initials: "LV",
      projects: [
        {
          name: "Diseno UX",
          issues: [
            {
              title: "Redesign onboarding flow",
              type: "Feature",
              priority: "High",
              status: "In Review",
            },
            {
              title: "Fix spacing in mobile nav",
              type: "Bug",
              priority: "Medium",
              status: "Done",
            },
          ],
        },
        {
          name: "Design System",
          issues: [
            {
              title: "Document color tokens v2",
              type: "Improvement",
              priority: "Low",
              status: "Done",
            },
          ],
        },
      ],
    },
  ],
};
