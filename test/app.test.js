const request = require("supertest");
const app = require("../index");

describe("GET /health", () => {
  it("should return ok", async () => {
    const res = await request(app).get("/health");
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe("ok");
  });
});
