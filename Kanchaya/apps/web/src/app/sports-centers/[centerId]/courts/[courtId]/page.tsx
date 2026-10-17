import { PublicCourtPage } from "../../../../public-court-page";

export default async function PublishedCourtPage({
  params,
}: {
  params: Promise<{ centerId: string; courtId: string }>;
}) {
  const { centerId, courtId } = await params;
  return <PublicCourtPage centerId={centerId} courtId={courtId} />;
}
