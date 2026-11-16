import { HomeScreen } from "@/components/home/home";
import appIcon from "@/components/home/assets/app-icon.png";

export const metadata = { title: "HelpLoop | Profile setup", icons: { icon: appIcon.src } };

export default function Onboarding() {
  return <HomeScreen configured={false} onboarding />;
}
