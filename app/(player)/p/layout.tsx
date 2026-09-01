import { PlayerMobileShell } from "@/features/player-h5/player-mobile-shell";

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return <PlayerMobileShell>{children}</PlayerMobileShell>;
}
