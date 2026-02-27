import type { AgentTool, AgentContext, OutputFile } from "@/lib/ai/agent/types";
import { uploadFile } from "@/lib/storage";
import { runChartInSandbox } from "../utils/run-chart";

async function generatePDF(
  content: string,
  title: string
): Promise<Buffer> {
  const ReactPDF = await import("@react-pdf/renderer");
  const React = (await import("react")).default;

  const { Document, Page, Text, View, StyleSheet } = ReactPDF;

  const styles = StyleSheet.create({
    page: { padding: 50, fontSize: 11, fontFamily: "Helvetica" },
    title: {
      fontSize: 22,
      marginBottom: 20,
      fontFamily: "Helvetica-Bold",
    },
    section: { marginBottom: 10 },
    heading: {
      fontSize: 14,
      marginTop: 15,
      marginBottom: 8,
      fontFamily: "Helvetica-Bold",
    },
    paragraph: { marginBottom: 6, lineHeight: 1.5 },
    bold: { fontFamily: "Helvetica-Bold" },
    listItem: { marginBottom: 4, paddingLeft: 15 },
  });

  // Parse markdown into structured blocks
  const lines = content.split("\n");
  const elements: React.ReactElement[] = [];

  elements.push(
    React.createElement(Text, { style: styles.title, key: "title" }, title)
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("# ")) {
      elements.push(
        React.createElement(
          Text,
          { style: styles.heading, key: `h-${i}` },
          line.replace(/^#+\s*/, "")
        )
      );
    } else if (line.startsWith("## ") || line.startsWith("### ")) {
      elements.push(
        React.createElement(
          Text,
          { style: styles.heading, key: `h-${i}` },
          line.replace(/^#+\s*/, "")
        )
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        React.createElement(
          Text,
          { style: styles.listItem, key: `li-${i}` },
          `• ${line.replace(/^[-*]\s*/, "")}`
        )
      );
    } else if (line.trim()) {
      elements.push(
        React.createElement(
          Text,
          { style: styles.paragraph, key: `p-${i}` },
          line.replace(/\*\*(.*?)\*\*/g, "$1")
        )
      );
    }
  }

  const doc = React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(View, {}, ...elements)
    )
  );

  const pdfStream = await ReactPDF.renderToBuffer(doc as any);
  return Buffer.from(pdfStream);
}

async function generateDOCX(
  content: string,
  title: string
): Promise<Buffer> {
  const docx = await import("docx");
  const {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    Packer,
  } = docx;

  const children: InstanceType<typeof Paragraph>[] = [];

  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 300 },
    })
  );

  const lines = content.split("\n");
  for (const line of lines) {
    if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^#+\s*/, ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 240, after: 120 },
        })
      );
    } else if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^#+\s*/, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
    } else if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          text: line.replace(/^#+\s*/, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: line.replace(/^[-*]\s*/, "") }),
          ],
          bullet: { level: 0 },
        })
      );
    } else if (line.trim()) {
      // Handle bold markers
      const parts = line.split(/\*\*(.*?)\*\*/);
      const runs: InstanceType<typeof TextRun>[] = [];
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
          runs.push(
            new TextRun({
              text: parts[i],
              bold: i % 2 === 1,
            })
          );
        }
      }
      children.push(
        new Paragraph({
          children: runs,
          spacing: { after: 120 },
        })
      );
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

async function generateXLSX(
  content: string,
  title: string
): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.slice(0, 31));

  // Try to parse content as tabular data
  const lines = content.split("\n").filter((l) => l.trim());

  // Check if content looks like a markdown table
  const tableLines = lines.filter((l) => l.includes("|"));
  if (tableLines.length > 2) {
    // Parse markdown table
    for (let i = 0; i < tableLines.length; i++) {
      const cells = tableLines[i]
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);

      // Skip separator lines (---|----|---)
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;

      const row = sheet.addRow(cells);
      if (i === 0) {
        row.font = { bold: true };
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFE0E0E0" },
          };
        });
      }
    }
  } else {
    // Dump content line by line
    sheet.addRow([title]).font = { bold: true, size: 14 };
    sheet.addRow([]);
    for (const line of lines) {
      sheet.addRow([line]);
    }
  }

  // Auto-fit columns
  sheet.columns.forEach((col) => {
    let maxLen = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > maxLen) maxLen = Math.min(len, 60);
    });
    col.width = maxLen + 2;
  });

  const xlsxBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(xlsxBuffer);
}

async function generateSectionsDOCX(
  title: string,
  sections: Array<{ heading: string; content: string; python_chart_code?: string }>
): Promise<Buffer> {
  const docx = await import("docx");
  const {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    Packer,
    ImageRun,
    Footer,
    PageNumber,
    AlignmentType,
  } = docx;

  const children: InstanceType<typeof Paragraph>[] = [];

  // Title
  children.push(
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  );

  for (const section of sections) {
    // Section heading
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 150 },
      })
    );

    // Section content — parse lines
    const lines = section.content.split("\n");
    for (const line of lines) {
      if (line.startsWith("## ") || line.startsWith("### ")) {
        children.push(
          new Paragraph({
            text: line.replace(/^#+\s*/, ""),
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          })
        );
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: line.replace(/^[-*]\s*/, "") }),
            ],
            bullet: { level: 0 },
          })
        );
      } else if (line.trim()) {
        const parts = line.split(/\*\*(.*?)\*\*/);
        const runs: InstanceType<typeof TextRun>[] = [];
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) {
            runs.push(new TextRun({ text: parts[i], bold: i % 2 === 1 }));
          }
        }
        children.push(
          new Paragraph({ children: runs, spacing: { after: 120 } })
        );
      }
    }

    // Embedded chart if python_chart_code is provided
    if (section.python_chart_code) {
      const chartBuf = await runChartInSandbox(section.python_chart_code);
      if (chartBuf) {
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: chartBuf,
                transformation: { width: 500, height: 350 },
                type: "png",
              }),
            ],
            spacing: { before: 200, after: 200 },
          })
        );
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        children,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}

export const generateDocumentTool: AgentTool = {
  name: "generate_document",
  description:
    "Generate a final output document. Supports two modes: (1) Legacy — provide content_markdown + format (pdf/docx/xlsx) for simple conversion. (2) Sections — provide title + sections array with optional python_chart_code per section to produce a structured DOCX with embedded charts and page numbers.",
  input_schema: {
    type: "object",
    properties: {
      content_markdown: {
        type: "string",
        description:
          "The full document content in markdown format (legacy mode). Include headings, bullet points, tables, and paragraphs.",
      },
      format: {
        type: "string",
        enum: ["pdf", "docx", "xlsx"],
        description: "The output file format (legacy mode).",
      },
      title: {
        type: "string",
        description: "The document title.",
      },
      sections: {
        type: "array",
        description:
          "Structured sections for the document (sections mode). Each section has a heading, content, and optional python_chart_code.",
        items: {
          type: "object",
          properties: {
            heading: { type: "string", description: "Section heading." },
            content: {
              type: "string",
              description: "Section content in markdown.",
            },
            python_chart_code: {
              type: "string",
              description:
                "Optional Python (matplotlib) code to generate an embedded chart for this section.",
            },
          },
          required: ["heading", "content"],
        },
      },
    },
    required: ["title"],
  },
  async execute(args: Record<string, unknown>, ctx: AgentContext) {
    const title = String(args.title);

    try {
      // Legacy path: content_markdown + format
      if (args.content_markdown && args.format) {
        const content = String(args.content_markdown);
        const format = String(args.format) as "pdf" | "docx" | "xlsx";

        let buffer: Buffer;
        let ext: string;

        switch (format) {
          case "pdf":
            buffer = await generatePDF(content, title);
            ext = "pdf";
            break;
          case "docx":
            buffer = await generateDOCX(content, title);
            ext = "docx";
            break;
          case "xlsx":
            buffer = await generateXLSX(content, title);
            ext = "xlsx";
            break;
          default:
            return {
              success: false,
              data: { error: `Unsupported format: ${format}` },
            };
        }

        const sanitizedTitle = title
          .replace(/[^a-zA-Z0-9_-]/g, "_")
          .slice(0, 100);
        const fileName = `${sanitizedTitle}.${ext}`;
        const storagePath = `outputs/${ctx.job.id}/${fileName}`;

        uploadFile(storagePath, buffer);

        const outputFile: OutputFile = {
          fileName,
          storagePath,
          fileSize: buffer.length,
          resultType: format,
          contentMarkdown: content,
        };

        return {
          success: true,
          data: {
            file_name: fileName,
            format,
            size_bytes: buffer.length,
            storage_path: storagePath,
            download_url: `/api/files/download?id=${storagePath}`,
          },
          output_files: [outputFile],
        };
      }

      // Sections path: title + sections → structured DOCX
      const sections = args.sections as
        | Array<{ heading: string; content: string; python_chart_code?: string }>
        | undefined;

      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        return {
          success: false,
          data: {
            error:
              "Provide either content_markdown+format (legacy) or sections array (structured).",
          },
        };
      }

      const buffer = await generateSectionsDOCX(title, sections);

      const sanitizedTitle = title
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 100);
      const fileName = `${sanitizedTitle}.docx`;
      const storagePath = `outputs/${ctx.job.id}/${fileName}`;

      uploadFile(storagePath, buffer);

      // Store in council_documents if session context available
      try {
        const { getDb } = await import("@/lib/db");
        const db = getDb();
        const sessionRow = db
          .prepare("SELECT id FROM council_sessions WHERE id = ?")
          .get(ctx.job.id) as { id: string } | undefined;

        if (sessionRow) {
          db.prepare(
            "INSERT INTO council_documents (id, session_id, title, content_markdown, document_type, storage_path) VALUES (?, ?, ?, ?, 'structured_docx', ?)"
          ).run(
            crypto.randomUUID(),
            ctx.job.id,
            title,
            sections.map((s) => `## ${s.heading}\n${s.content}`).join("\n\n"),
            storagePath
          );
        }
      } catch {
        // Non-critical — skip if DB insert fails
      }

      const outputFile: OutputFile = {
        fileName,
        storagePath,
        fileSize: buffer.length,
        resultType: "docx",
      };

      return {
        success: true,
        data: {
          file_name: fileName,
          format: "docx",
          size_bytes: buffer.length,
          storage_path: storagePath,
          download_url: `/api/files/download?id=${storagePath}`,
          sections_count: sections.length,
        },
        output_files: [outputFile],
      };
    } catch (err) {
      return {
        success: false,
        data: {
          error:
            err instanceof Error
              ? err.message
              : "Failed to generate document",
        },
      };
    }
  },
};
