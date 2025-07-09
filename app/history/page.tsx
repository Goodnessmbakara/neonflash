"use client"

import { Toaster } from "@/components/ui/toaster"
import Layout from "@/components/layout"
import History from "@/components/pages/history"

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Layout>
        <History />
      </Layout>
      <Toaster />
    </div>
  )
}
