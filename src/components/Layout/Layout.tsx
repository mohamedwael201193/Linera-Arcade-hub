import type { ReactNode } from 'react'
import { useWallet } from '../../contexts/WalletContext'
import { ProfileSetupModal } from '../Wallet/ProfileSetupModal'
import { WalletSelectorModal } from '../Wallet/WalletSelectorModal'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { isModalOpen, closeModal, state } = useWallet()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Top bar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>

      {/* Wallet selector modal */}
      {isModalOpen && <WalletSelectorModal onClose={closeModal} />}

      {/* Profile setup modal */}
      {state === 'no-profile' && <ProfileSetupModal />}
    </div>
  )
}
