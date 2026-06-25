import fs from "fs";
import Handlebars from "handlebars";
import path from "path";
import { chromium } from "playwright";
import { DocumentConfig } from "../../documents/types";

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

function getTemplate(templatePath: string): HandlebarsTemplateDelegate {
  const resolvedPath = resolveTemplatePath(templatePath);
  const cached = templateCache.get(resolvedPath);
  if (cached) {
    return cached;
  }

  const source = fs.readFileSync(resolvedPath, "utf-8");
  const compiled = Handlebars.compile(source);
  templateCache.set(resolvedPath, compiled);
  return compiled;
}

function resolveTemplatePath(templatePath: string): string {
  if (fs.existsSync(templatePath)) {
    return templatePath;
  }

  const distSegment = `${path.sep}dist${path.sep}`;
  if (templatePath.includes(distSegment)) {
    const srcPath = templatePath.replace(distSegment, `${path.sep}src${path.sep}`);
    if (fs.existsSync(srcPath)) {
      return srcPath;
    }
  }

  return templatePath;
}

export function generarHtml<T>(datos: T, config: DocumentConfig<any>): string {
  return getTemplate(config.templatePath)(datos);
}

export async function generarPdf<T>(
  datos: T,
  config: DocumentConfig<any>,
): Promise<Buffer> {
  const html = generarHtml(datos, config);
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({
      viewport: { width: 1240, height: 1050 },
    });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);

    return page.pdf({
      printBackground: true,
      width: "1240px",
      height: "1050px",
      pageRanges: "1",
    });
  } finally {
    await browser.close();
  }
}
