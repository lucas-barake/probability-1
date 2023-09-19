import { z } from "zod";
import * as simpleStatistics from "simple-statistics";
import { WeibullParams, weibullMLE } from "./weibull-mle";
import * as mathjs from "mathjs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

const variables = ["Velocity_of_the_Wind", "Temperature"] as const;
const cities = ["SAN GIL", "POPAYÁN"];

const city = z.object({
  Cod_Div: z.unknown(),
  Latitude: z.unknown(),
  Longitude: z.unknown(),
  Region: z.string(),
  Department: z.string(),
  Municipality: z.string(),
  Date: z.string(),
  Temperature: z.number({ coerce: true }),
  Velocity_of_the_Wind: z.number({ coerce: true }),
  Direction_of_the_wind: z.number({ coerce: true }),
  Pressure: z.number({ coerce: true }),
  Dew_Point: z.number({ coerce: true }),
  Cloudy_Full_Coverage: z.number({ coerce: true }),
  Precipitation: z.number({ coerce: true }),
  Storm_Chance: z.number({ coerce: true }),
  Humidity: z.unknown(),
  Forecast: z.string(),
});
type City = z.infer<typeof city>;

const margin = { top: 20, right: 20, bottom: 30, left: 40 };

function getWhiskerPlotData(
  data: City[],
  variable: (typeof variables)[number],
  city: (typeof cities)[number]
) {
  const filteredData = data.filter((d) => d.Municipality === city);
  const values = filteredData.map((d) => d[variable]);
  return {
    min: simpleStatistics.min(values),
    q1: simpleStatistics.quantile(values, 0.25),
    median: simpleStatistics.median(values),
    q3: simpleStatistics.quantile(values, 0.75),
    max: simpleStatistics.max(values),
  };
}

function getProbabilityDistribution(weibullParams: WeibullParams, values: number[]) {
  // create an array of x values from 0 to the maximum value in the data
  const xValues = mathjs.range(0, mathjs.max(values), 0.1).toArray();

  // create an array of y values by applying the Weibull probability density function
  const yValues = xValues.map((x) => {
    // cast x to number type
    x = Number(x);
    return (
      (weibullParams.k / weibullParams.c) *
      (x / weibullParams.c) ** (weibullParams.k - 1) *
      mathjs.exp(-((x / weibullParams.c) ** weibullParams.k))
    );
  });

  // return an object with x and y arrays
  return { x: xValues, y: yValues };
}

async function createHistogram(data: City[], variable: (typeof variables)[number], city: string) {
  // create a new instance of chartjs-node-canvas with width and height options
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width: 800, height: 600 });

  // define the chart configuration object
  const configuration = {
    type: "scatter", // use scatter type for the chart
    data: {
      // define the data for the chart
      datasets: [
        // use one dataset for the histogram and one for the probability distribution
        {
          label: `Histogram of ${variable} for ${city}`, // label for the histogram dataset
          data: data
            .filter((d) => d.Municipality === city)
            .map((d) => ({ x: d[variable], y: null })), // map the data to x and y coordinates
          backgroundColor: "rgba(255,99,132,0.2)", // set the background color for the histogram bars
          borderColor: "rgba(255,99,132,1)", // set the border color for the histogram bars
          borderWidth: 1, // set the border width for the histogram bars
          showLine: false, // do not show a line connecting the points
          pointRadius: 0, // set the point radius to zero to hide the points
          xAxisID: "histogram", // use the histogram axis for the x values
          yAxisID: "frequency", // use the frequency axis for the y values
        },
        {
          label: `Probability Distribution of ${variable} for ${city}`, // label for the probability distribution dataset
          data: getProbabilityDistribution(
            weibullMLE(
              data.filter((d) => d.Municipality === city).map((d) => d.Velocity_of_the_Wind)
            ),
            data.filter((d) => d.Municipality === city).map((d) => d[variable])
          ).x.map((x, i) => ({
            x,
            y: getProbabilityDistribution(
              weibullMLE(
                data.filter((d) => d.Municipality === city).map((d) => d.Velocity_of_the_Wind)
              ),
              data.filter((d) => d.Municipality === city).map((d) => d[variable])
            ).y[i],
          })), // map the x and y values of the probability distribution to coordinates
          backgroundColor: "rgba(54,162,235,0.2)", // set the background color for the probability distribution line
          borderColor: "rgba(54,162,235,1)", // set the border color for the probability distribution line
          borderWidth: 3, // set the border width for the probability distribution line
          showLine: true, // show a line connecting the points
          pointRadius: 0, // set the point radius to zero to hide the points
          xAxisID: "histogram", // use the histogram axis for the x values
          yAxisID: "probability", // use the probability axis for the y values
        },
      ],
    },
    options: {
      // define the options for the chart
      title: {
        // set the title options
        display: true, // display the title
        text: `Histogram and Probability Distribution of ${variable} for ${city}`, // set the title text
        fontSize: 24, // set the title font size
      },
      scales: {
        // define the scales for the axes
        histogram: {
          // define the histogram axis
          type: "linear", // use a linear type for the axis
          position: "bottom", // position the axis at the bottom
          scaleLabel: {
            // set the scale label options
            display: true, // display the scale label
            labelString: variable, // set the scale label text
            fontSize: 18, // set the scale label font size
          },
          ticks: {
            // set the tick options
            beginAtZero: true, // start the ticks at zero
            fontSize: 16, // set the tick font size
          },
        },
        frequency: {
          // define the frequency axis
          type: "linear", // use a linear type for the axis
          position: "left", // position the axis at the left
          scaleLabel: {
            // set the scale label options
            display: true, // display the scale label
            labelString: "Frequency", // set the scale label text
            fontSize: 18, // set the scale label font size
          },
          ticks: {
            // set the tick options
            beginAtZero: true, // start the ticks at zero
            fontSize: 16, // set the tick font size
          },
        },
        probability: {
          // define the probability axis
          type: "linear", // use a linear type for the axis
          position: "right", // position the axis at the right
          scaleLabel: {
            // set the scale label options
            display: true, // display the scale label
            labelString: "Probability Density", // set the scale label text
            fontSize: 18, // set the scale label font size
          },
          ticks: {
            // set the tick options
            beginAtZero: true, // start the ticks at zero
            fontSize: 16, // set the tick font size
          },
        },
      },
      legend: {
        // define the legend options
        display: true, // display the legend
        labels: {
          // set the label options
          fontSize: 18, // set the label font size
        },
      },
    },
    margin, // use the margin object for the chart margin
  };

  // render the chart as a PNG image and return it as a buffer
  const image = await chartJSNodeCanvas.renderToBuffer(configuration);

  // return the image buffer and the weibull parameters
  return {
    image,
    weibull_params: weibullMLE(
      data.filter((d) => d.Municipality === city).map((d) => d.Velocity_of_the_Wind)
    ),
  };
}

const data = await Bun.file(`${__dirname}/data.json`).json<City[]>();
const parsedData = data.map((d) => city.parse(d));

for (const variable of variables) {
  for (const city of cities) {
    const histogram = await createHistogram(parsedData, variable, city); // use await to get the histogram result

    Bun.write(
      `${__dirname}/output/${city}_${variable}/histogram.png`,
      histogram.image // write the image buffer to a PNG file
    );

    Bun.write(
      `${__dirname}/histograms/${city}_${variable}.json`,
      JSON.stringify(
        {
          ...histogram,
          whisker_plot_data: getWhiskerPlotData(parsedData, variable, city),
        },
        null,
        2
      )
    );
  }
}
