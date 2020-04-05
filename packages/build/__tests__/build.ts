import path from "path";
import fse from "fs-extra";
import execa from "execa";
import build from "../index.ts";

jest.mock("execa");

describe("build tests", () => {
  let defaultBuildManifest;
  let apiBuildManifest;

  const fixturePath = path.join(__dirname, "./fixtures/basic-app");

  beforeEach(async () => {
    execa.mockResolvedValueOnce();

    await build({
      src: fixturePath,
      dst: path.join(fixturePath, ".slsnext"),
    });

    defaultBuildManifest = await fse.readJSON(
      path.join(fixturePath, `.slsnext/default-lambda/manifest.json`)
    );

    apiBuildManifest = await fse.readJSON(
      path.join(fixturePath, `.slsnext/api-lambda/manifest.json`)
    );
  });

  describe("Default build manifest", () => {
    it("adds full manifest", () => {
      const {
        publicFiles,
        pages: {
          ssr: { dynamic, nonDynamic },
          html,
        },
        cloudFrontOrigins: { staticOrigin },
      } = defaultBuildManifest;

      expect(dynamic).toEqual({
        "/:root": {
          file: "pages/[root].js",
          regex: expect.any(String),
        },
        "/customers/:customer": {
          file: "pages/customers/[customer].js",
          regex: expect.any(String),
        },
        "/customers/:customer/:post": {
          file: "pages/customers/[customer]/[post].js",
          regex: expect.any(String),
        },
        "/customers/:customer/profile": {
          file: "pages/customers/[customer]/profile.js",
          regex: expect.any(String),
        },
        "/customers/:catchAll*": {
          file: "pages/customers/[...catchAll].js",
          regex: expect.any(String),
        },
      });

      expect(nonDynamic).toEqual({
        "/customers/new": "pages/customers/new.js",
        "/": "pages/index.js",
        "/_app": "pages/_app.js",
        "/_document": "pages/_document.js",
        "/404": "pages/404.js",
      });

      expect(html).toEqual({
        nonDynamic: {
          "/terms": "pages/terms.html",
          "/about": "pages/about.html",
        },
        dynamic: {
          "/blog/:post": {
            file: "pages/blog/[post].html",
            regex: expect.any(String),
          },
        },
      });

      expect(publicFiles).toEqual({
        "/favicon.ico": "favicon.ico",
        "/sub/image.png": "sub/image.png",
        "/sw.js": "sw.js",
      });

      expect(staticOrigin).toBeUndefined();
    });
  });

  describe("API build manifest", () => {
    it("adds full api manifest", () => {
      const {
        apis: { dynamic, nonDynamic },
      } = apiBuildManifest;

      expect(nonDynamic).toEqual({
        "/api/customers": "pages/api/customers.js",
        "/api/customers/new": "pages/api/customers/new.js",
      });
      expect(dynamic).toEqual({
        "/api/customers/:id": {
          file: "pages/api/customers/[id].js",
          regex: expect.any(String),
        },
      });
    });
  });

  describe("Default lambda build files", () => {
    it("copies build files", async () => {
      expect.assertions(4);

      const files = await fse.readdir(
        path.join(fixturePath, `${DEFAULT_LAMBDA_CODE_DIR}`)
      );
      const pages = await fse.readdir(
        path.join(fixturePath, `${DEFAULT_LAMBDA_CODE_DIR}/pages`)
      );
      const customerPages = await fse.readdir(
        path.join(fixturePath, `${DEFAULT_LAMBDA_CODE_DIR}/pages/customers`)
      );
      const apiDirExists = await fse.exists(
        path.join(fixturePath, `${DEFAULT_LAMBDA_CODE_DIR}/pages/api`)
      );

      expect(files).toEqual([
        "index.js",
        "manifest.json",
        "next-aws-cloudfront.js",
        "pages",
      ]);

      // api pages should not be included in the default lambda
      expect(apiDirExists).toEqual(false);

      // html pages should not be included in the default lambda
      expect(pages).toEqual(["_error.js", "blog.js", "customers"]);
      expect(customerPages).toEqual(["[...catchAll].js", "[post].js"]);
    });
  });

  describe("API lambda build files", () => {
    it("copies build files", async () => {
      expect.assertions(2);

      const files = await fse.readdir(
        path.join(fixturePath, `${API_LAMBDA_CODE_DIR}`)
      );
      const pages = await fse.readdir(
        path.join(fixturePath, `${API_LAMBDA_CODE_DIR}/pages`)
      );

      expect(files).toEqual([
        "index.js",
        "manifest.json",
        "next-aws-cloudfront.js",
        "pages",
      ]);
      expect(pages).toEqual(["_error.js", "api"]);
    });
  });
});