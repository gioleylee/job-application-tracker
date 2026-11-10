const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = __dirname;
const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const server = http.createServer(async (request, response) => {
  let pathname;

  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${host}`).pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);
  const inside = path.relative(root, filePath);

  // Stay inside the project folder and never serve dotfiles or dependencies.
  if (!inside || inside.startsWith("..") || path.isAbsolute(inside)
    || inside.split(path.sep).some((part) => part.startsWith(".") || part === "node_modules")) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const buffer = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = contentTypes[extension] || "application/octet-stream";

    response.writeHead(200, { "Content-Type": contentType });
    response.end(buffer);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(500);
    response.end("Server error");
  }
});

server.listen(port, host, () => {
  console.log(`Job Application Tracker available at http://127.0.0.1:${port}`);
});
