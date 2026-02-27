import { ChartJSNodeCanvas } from "chartjs-node-canvas";

export type ChartSpec = {
  type: "bar" | "line" | "pie" | "doughnut" | "radar";
  title: string;
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
};

const PALETTE = [
  "rgba(54, 162, 235, 0.8)",  // blue
  "rgba(75, 192, 192, 0.8)",  // green
  "rgba(255, 159, 64, 0.8)",  // orange
  "rgba(153, 102, 255, 0.8)", // purple
  "rgba(255, 99, 132, 0.8)",  // red
  "rgba(255, 205, 86, 0.8)",  // yellow
];

const BORDER_PALETTE = [
  "rgba(54, 162, 235, 1)",
  "rgba(75, 192, 192, 1)",
  "rgba(255, 159, 64, 1)",
  "rgba(153, 102, 255, 1)",
  "rgba(255, 99, 132, 1)",
  "rgba(255, 205, 86, 1)",
];

const chartCanvas = new ChartJSNodeCanvas({
  width: 800,
  height: 400,
  backgroundColour: "white",
});

export async function generateChartImage(spec: ChartSpec): Promise<Buffer> {
  const isPie = spec.type === "pie" || spec.type === "doughnut";

  const datasets = spec.datasets.map((ds, i) => ({
    label: ds.label,
    data: ds.data,
    backgroundColor:
      ds.backgroundColor ??
      (isPie ? PALETTE.slice(0, ds.data.length) : PALETTE[i % PALETTE.length]),
    borderColor:
      ds.borderColor ??
      (isPie
        ? BORDER_PALETTE.slice(0, ds.data.length)
        : BORDER_PALETTE[i % BORDER_PALETTE.length]),
    borderWidth: isPie ? 2 : 2,
  }));

  const config: any = {
    type: spec.type,
    data: {
      labels: spec.labels,
      datasets,
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: true, position: "top" as const },
        title: {
          display: true,
          text: spec.title,
          font: { size: 16, weight: "bold" as const },
        },
      },
      ...(isPie
        ? {}
        : {
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(0, 0, 0, 0.06)" },
              },
              x: {
                grid: { color: "rgba(0, 0, 0, 0.06)" },
              },
            },
          }),
    },
  };

  const buffer = await chartCanvas.renderToBuffer(config);
  return Buffer.from(buffer);
}
