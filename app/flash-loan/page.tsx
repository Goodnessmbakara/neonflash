"use client"

import { Toaster } from "@/components/ui/toaster"
import Layout from "@/components/layout"
import FlashLoan from "@/components/pages/flash-loan"

export default function FlashLoanPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Layout>
        <FlashLoan />
      </Layout>
      <Toaster />
    </div>
  )
}
