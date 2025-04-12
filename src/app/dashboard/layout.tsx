import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between h-auto sm:h-16">
            <div className="flex justify-center sm:justify-start py-4 sm:py-0">
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center gap-2">
                  <Image src="/logoDashName.png" alt="Logo" width={32} height={32} />
                  <span className="text-xl font-bold">IoT Dashboard</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2 py-4 sm:py-0">
              <Button variant="outline" asChild>
                <Link href="/dashboard/documentation">Documentation</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard/account">Mon compte</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Déconnexion</Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
} 