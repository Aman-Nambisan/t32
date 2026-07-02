"use client";

import dynamic from "next/dynamic";
import type { Block } from "@/lib/types";
import BarChart from "./BarChart";
import DonutChart from "./DonutChart";
import LineChart from "./LineChart";
import MemoCard from "./MemoCard";
import StatsCard from "./StatsCard";
import "./blocks.css";

function CoinsLoading() {
  return <div className="h-[248px] w-full animate-pulse rounded-xl border border-white/10 bg-black/40" />;
}

// Lazy-load the R3F block so three.js stays out of the main chat bundle.
const CoinStacks3D = dynamic(() => import("./CoinStacks3D"), {
  ssr: false,
  loading: CoinsLoading,
});

function renderBlock(block: Block, dark?: boolean) {
  switch (block.type) {
    case "bar":
      return <BarChart title={block.title} unit={block.unit} data={block.data} dark={dark} />;
    case "line":
      return <LineChart title={block.title} unit={block.unit} data={block.data} dark={dark} />;
    case "donut":
      return <DonutChart title={block.title} unit={block.unit} data={block.data} dark={dark} />;
    case "stats":
      return <StatsCard title={block.title} items={block.items} dark={dark} />;
    case "memo":
      return (
        <MemoCard
          title={block.title}
          subject={block.subject}
          body={block.body}
          classification={block.classification}
        />
      );
    case "coins3d":
      return <CoinStacks3D title={block.title} unit={block.unit} data={block.data} />;
    default:
      return null; // unknown block from the model — drop silently
  }
}

export default function Blocks({ blocks, dark }: { blocks: Block[]; dark?: boolean }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      {blocks.map((block, i) => (
        <div key={`${block.type}-${i}`} className="blk-in min-w-0" style={{ animationDelay: `${i * 110}ms` }}>
          {renderBlock(block, dark)}
        </div>
      ))}
    </div>
  );
}
