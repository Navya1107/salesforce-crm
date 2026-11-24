
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

import {
  CRMError,
  currentUser,
  getAll,
  getOne,
  create,
  update,
  remove,
  convertLead,
  stats,
  getAudit,
  getFlows,
  getSecurity,
  getMeta,
  reset,
  dbHealth
} from "./engine.mjs";

import { handleGraphQL, EXAMPLES } from "./graphql-lab.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4100);

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,x-demo-user",
  "Cache-Control": "no-store"
};

function send(res, status, body, type = "application/json") {
  res.writeHead(status, {
    "Content-Type": type,
    ...corsHeaders
  });

  res.end(
    type === "application/json"
      ? JSON.stringify(body)
      : body
  );
}

const readBody = (req) =>
  new Promise((resolveBody, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1024 * 1024) {
        reject(new CRMError("Request exceeds 1 MB", 413));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolveBody(body ? JSON.parse(body) : {});
      } catch {
        reject(new CRMError("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });

function servePublic(res, path) {
  const file = join(
    here,
    "public",
    path === "/" ? "index.html" : path.slice(1)
  );

  const directory = resolve(here, "public");

  if (!resolve(file).startsWith(directory) || !existsSync(file)) {
    return send(res, 404, { error: "Resource not found" });
  }

  const extension = file.split(".").pop();

  const mime = {
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    svg: "image/svg+xml"
  }[extension] || "text/plain";

  send(res, 200, readFileSync(file, "utf8"), mime);
}

export const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return send(res, 204, {});
  }

  try {
    const url = new URL(req.url, "http://localhost");
    const parts = url.pathname.split("/").filter(Boolean);

    const user = currentUser(
      req.headers["x-demo-user"] || "u1"
    );

    if (parts[0] !== "api") {
      if (req.method !== "GET") {
        return send(res, 405, {
          error: "Method not allowed"
        });
      }

      return servePublic(res, url.pathname);
    }

    const path = parts[1];
    const id = parts[2];

    if (path === "health" && req.method === "GET") {
      return send(res, 200, await dbHealth());
    }

    if (path === "session" && req.method === "GET") {
      return send(res, 200, {
        user,
        availableUsers: getMeta().users
      });
    }

    if (path === "metadata" && req.method === "GET") {
      return send(res, 200, getMeta());
    }

    if (path === "overview" && req.method === "GET") {
      return send(res, 200, await stats(user));
    }

    if (path === "security" && req.method === "GET") {
      return send(res, 200, getSecurity(user));
    }

    if (path === "workflows" && req.method === "GET") {
      return send(res, 200, await getFlows(user));
    }

    if (path === "audit" && req.method === "GET") {
      return send(res, 200, await getAudit(user));
    }

    if (path === "graphql-examples" && req.method === "GET") {
      return send(res, 200, EXAMPLES);
    }

    if (path === "graphql" && req.method === "POST") {
      return send(
        res,
        200,
        await handleGraphQL(user, await readBody(req))
      );
    }

    if (path === "reset" && req.method === "POST") {
      return send(res, 200, await reset(user));
    }

    if (
      path === "leads" &&
      id &&
      parts[3] === "convert" &&
      req.method === "POST"
    ) {
      return send(
        res,
        200,
        await convertLead(user, id, await readBody(req))
      );
    }

    if (
      ["leads", "contacts", "accounts", "opportunities", "cases", "tasks"].includes(path)
    ) {
      if (req.method === "GET") {
        const result = id
          ? await getOne(user, path, id)
          : await getAll(
              user,
              path,
              Object.fromEntries(url.searchParams)
            );

        return send(res, 200, result);
      }

      if (!id && req.method === "POST") {
        return send(
          res,
          201,
          await create(user, path, await readBody(req))
        );
      }

      if (id && req.method === "PATCH") {
        return send(
          res,
          200,
          await update(user, path, id, await readBody(req))
        );
      }

      if (id && req.method === "DELETE") {
        return send(res, 200, await remove(user, path, id));
      }
    }

    return send(res, 404, {
      error: "Unknown API endpoint",
      route: url.pathname
    });
  } catch (error) {
    return send(res, error.status || 500, {
      error: error.message || "Unexpected server error",
      type: error instanceof CRMError
        ? "CRMError"
        : "ServerError"
    });
  }
});

if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Salesforce CRM API running at http://127.0.0.1:${PORT}`);
  });
}
