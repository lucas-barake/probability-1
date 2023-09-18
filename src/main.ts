import { z } from "zod";
import * as simpleStatistics from "simple-statistics";
import { WeibullParams, weibullMLE } from "./weibull-mle";
import fs from "fs";
import * as mathjs from "mathjs";

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

function createHistogram(data: City[], variable: (typeof variables)[number], city: string) {
  const filteredData = data.filter((d) => d.Municipality === city);

  const windSpeeds = filteredData.map((d) => d.Velocity_of_the_Wind);
  const weibullParams = weibullMLE(windSpeeds);

  const values = filteredData.map((d) => d[variable]);

  const probabilityDistribution = getProbabilityDistribution(weibullParams, values);

  const mean = simpleStatistics.mean(values);
  const standardDeviation = simpleStatistics.standardDeviation(values);

  const coefficientOfVariation = (standardDeviation / mean) * 100;

  const trace = {
    x: values,
    type: "histogram",
    xbins: {
      size: (Math.max(...values) - Math.min(...values)) / 20, // fixed bin size
    },
  };

  const layout = {
    title: `Histogram of ${variable} for ${city} (CV = ${coefficientOfVariation.toFixed(2)}%)`,
    xaxis: {
      title: variable,
    },
    yaxis: {
      title: "Frequency",
    },
    margin,
  };

  const figure = { data: [trace], layout };

  return {
    ...figure,
    weibull_params: weibullParams,
    probability_distribution: probabilityDistribution,
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

const data = await Bun.file(`${__dirname}/data.json`).json<City[]>();
const parsedData = data.map((d) => city.parse(d));

for (const variable of variables) {
  for (const city of cities) {
    const histogram = createHistogram(parsedData, variable, city);
    const dirName = `${city}_${variable}`;

    // create directory if it doesn't exist
    if (!fs.existsSync(`${__dirname}/output/${dirName}`)) {
      fs.mkdirSync(`${__dirname}/output/${dirName}`);
    }

    Bun.write(
      `${__dirname}/output/${dirName}/histogram-data-x.csv`,
      ["A", ...histogram.data[0].x].join("\n")
    );

    Bun.write(
      `${__dirname}/output/${dirName}/data.json`,
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
