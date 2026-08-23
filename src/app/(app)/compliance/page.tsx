import { redirect } from 'next/navigation'

// Control Checklist Control Library-nin "Testing & Effectiveness" tabına köçdü.
// Bu marşrut heç bir menyuda görünmürdü; köhnə linklər sınmasın deyə saxlanılır.
export default function CompliancePage() {
  redirect('/controls')
}
