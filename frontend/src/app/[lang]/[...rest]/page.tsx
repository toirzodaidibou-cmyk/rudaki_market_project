import { notFound } from "next/navigation";

// Ҳар суроғаи номаълум (масалан /tg/abc) саҳифаи 404-и забондорро
// бо navbar ва менюи поён нишон медиҳад.
export default function CatchAll() {
  notFound();
}
