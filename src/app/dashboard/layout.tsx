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
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold">
                  <Image src="/logoDashName.png" alt="Logo" width={32} height={32} />
                    IoT Dashboard
                  </span>
              </div>
            </div>
            <div className="flex items-center">
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