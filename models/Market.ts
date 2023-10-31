type PriceItem = {
  avg: number;
  max: number;
  median: number;
  min: number;
  order_count: number;
  percentile: number;
  stddev: number;
  volume: number;
}

type Prices = {
  all: PriceItem;
  buy: PriceItem;
  sell: PriceItem;
  strategy: string;
  updated: Date;
}