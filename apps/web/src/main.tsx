import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "./App";
import { BrandProvider, loadBrand, startEditionWording } from "@/lib/brand";
import "./index.css";

const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, refetchOnWindowFocus: false } } });

loadBrand().then((brand) => createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrandProvider value={brand}>
    <QueryClientProvider client={qc}>
      <TooltipProvider delayDuration={300} skipDelayDuration={300}>
        <BrowserRouter><App /></BrowserRouter>
        <Toaster position="bottom-right" richColors />
      </TooltipProvider>
    </QueryClientProvider>
    </BrandProvider>
  </StrictMode>,
)).then(() => startEditionWording());
