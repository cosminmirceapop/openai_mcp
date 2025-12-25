#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import http from 'http';

// Define course interface
interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: number; // in weeks
  level: string;
  subject: string;
  provider: string;
  url: string;
}

// Mock course data
const mockCourses: Course[] = [
  {
    id: "1",
    title: "Introduction to Machine Learning",
    description: "Learn the basics of machine learning algorithms and applications.",
    instructor: "Dr. Jane Smith",
    duration: 8,
    level: "beginner",
    subject: "Computer Science",
    provider: "Coursera",
    url: "https://coursera.org/course/ml-intro"
  },
  {
    id: "2",
    title: "Advanced Python Programming",
    description: "Deep dive into Python programming with advanced concepts.",
    instructor: "Prof. John Doe",
    duration: 12,
    level: "advanced",
    subject: "Computer Science",
    provider: "edX",
    url: "https://edx.org/course/python-adv"
  },
  {
    id: "3",
    title: "Data Structures and Algorithms",
    description: "Master fundamental data structures and algorithms.",
    instructor: "Dr. Alice Johnson",
    duration: 10,
    level: "intermediate",
    subject: "Computer Science",
    provider: "Udacity",
    url: "https://udacity.com/course/dsa"
  },
  {
    id: "4",
    title: "Calculus I",
    description: "Introduction to differential and integral calculus.",
    instructor: "Prof. Bob Wilson",
    duration: 16,
    level: "beginner",
    subject: "Mathematics",
    provider: "Khan Academy",
    url: "https://khanacademy.org/calculus1"
  },
  {
    id: "5",
    title: "Web Development with React",
    description: "Build modern web applications using React.js.",
    instructor: "Ms. Carol Brown",
    duration: 6,
    level: "intermediate",
    subject: "Computer Science",
    provider: "freeCodeCamp",
    url: "https://freecodecamp.org/react"
  }
];

// Function to search courses based on parameters
function searchCourses(params: {
  query?: string;
  subject?: string;
  level?: string;
  duration?: number;
  provider?: string;
}): Course[] {
  let results = mockCourses;

  if (params.query) {
    const query = params.query.toLowerCase();
    results = results.filter(course =>
      course.title.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query) ||
      course.instructor.toLowerCase().includes(query)
    );
  }

  if (params.subject) {
    results = results.filter(course =>
      course.subject.toLowerCase() === params.subject!.toLowerCase()
    );
  }

  if (params.level) {
    results = results.filter(course =>
      course.level.toLowerCase() === params.level!.toLowerCase()
    );
  }

  if (params.duration) {
    results = results.filter(course => course.duration <= params.duration!);
  }

  if (params.provider) {
    results = results.filter(course =>
      course.provider.toLowerCase() === params.provider!.toLowerCase()
    );
  }

  return results;
}

// Create an MCP server
const server = new McpServer({
  name: "course-catalog-server",
  version: "0.1.0"
});

// Add a tool for searching courses
server.tool(
  "search_courses",
  {
    query: z.string().optional().describe("Search keywords (e.g., 'machine learning', 'python programming')"),
    subject: z.string().optional().describe("Subject area (e.g., 'Computer Science', 'Mathematics')"),
    level: z.string().optional().describe("Difficulty level ('beginner', 'intermediate', 'advanced')"),
    duration: z.number().optional().describe("Maximum course duration in weeks"),
    provider: z.string().optional().describe("Platform provider (e.g., 'Coursera', 'edX')")
  },
  async ({ query, subject, level, duration, provider }) => {
    try {
      const courses = searchCourses({ query, subject, level, duration, provider });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(courses, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching courses: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Create HTTP server
const server_http = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/sse' && req.method === 'GET') {
    // @ts-ignore
    const transport = new SSEServerTransport(res, req);
    server.connect(transport).catch(console.error);
  } else if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', server: 'course-catalog-mcp' }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || 3001;

server_http.listen(PORT, () => {
  console.log(`Course Catalog MCP SSE server running on port ${PORT}`);
  console.log(`SSE endpoint: http://localhost:${PORT}/sse`);
});