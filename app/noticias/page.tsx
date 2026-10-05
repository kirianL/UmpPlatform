"use client";

import PageContainer from "@/components/public/PageContainer";
import { Tabs } from "@/components/public/Tabs";
import NewsCms from "@/components/web/NewsCms";
import PortfolioCms from "@/components/web/PortfolioCms";

export default function PaginaWebPage() {
  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-grayscale-12">Página web</h1>
        <p className="mt-1 text-sm text-grayscale-9">
          Noticias y portafolio que se muestran en la landing.
        </p>
      </div>

      <Tabs.Root
        defaultValue="noticias"
        className="flex w-full flex-col gap-6"
      >
        <div className="flex flex-col gap-3 border-b border-grayscale-3 pb-2 dark:border-grayscale-4 sm:flex-row sm:items-center sm:justify-between">
          <Tabs.List className="gap-1.5 border-0 pb-0">
            <Tabs.Tab
              value="noticias"
              className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase"
            >
              Noticias
            </Tabs.Tab>
            <Tabs.Tab
              value="portafolio"
              className="px-3 py-1.5 font-mono text-[10px] font-bold uppercase"
            >
              Portafolio
            </Tabs.Tab>
            <Tabs.Indicator />
          </Tabs.List>
        </div>

        <Tabs.Panel value="noticias">
          <NewsCms />
        </Tabs.Panel>
        <Tabs.Panel value="portafolio">
          <PortfolioCms />
        </Tabs.Panel>
      </Tabs.Root>
    </PageContainer>
  );
}
