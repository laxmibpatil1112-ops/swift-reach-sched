import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/scheduler/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["SCHEDULER_RUN_SECRET"];
        if (secret && request.headers.get("x-scheduler-secret") !== secret) {
          return new Response("Unauthorized", { status: 401 });
        }
        try {
          const { runWorker } = await import("@/lib/worker.server");
          return Response.json(await runWorker());
        } catch (error) {
          return Response.json(
            { error: error instanceof Error ? error.message : "Worker failed" },
            { status: 500 },
          );
        }
      },
    },
  },
});
