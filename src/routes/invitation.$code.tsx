import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { invitationCodeSchema } from "@/features/auth/schemas";
import { supabase } from "@/lib/supabase";

// Lien d'invitation à l'application (ISC-04, ISC-05). Après connexion, on revient
// ici : si le compte n'a pas été créé avec ce code, il existait déjà.
export const Route = createFileRoute("/invitation/$code")({
  beforeLoad: async ({ params }) => {
    const code = invitationCodeSchema.safeParse(params.code);
    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      throw redirect({
        to: "/connexion",
        search: { invitation: code.success ? code.data : undefined },
      });
    }

    const createdWithThisCode =
      code.success && session.user.user_metadata.invitation_code === code.data;
    if (createdWithThisCode) throw redirect({ to: "/" });
  },
  component: AlreadyRegistered,
});

function AlreadyRegistered() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Vous avez déjà un compte</h1>
      <Link to="/" className="inline-flex min-h-11 items-center underline">
        Ouvrir Rayon
      </Link>
    </main>
  );
}
