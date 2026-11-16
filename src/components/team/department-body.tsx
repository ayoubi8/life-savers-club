import { EventContent } from "@/components/events/event-content";
import { EventGallery } from "@/components/events/event-gallery";
import { docMediaUrls, isEmptyDoc } from "@/lib/events/content";
import { localized } from "@/lib/events/utils";
import type { DepartmentFull } from "@/lib/team/types";
import { DepartmentLeader } from "./department-leader";
import { MembersGrid } from "./members-grid";

export type DepartmentLabels = {
  leader: string;
  mission: string;
  team: string;
  members: string;
  emptyMission?: string;
};

/**
 * Everything below the header of a department page: the leader, what the department does,
 * and the team images (one big group photo, one card per member, or both).
 */
export function DepartmentBody({ department, locale, labels }: { department: DepartmentFull; locale: string; labels: DepartmentLabels }) {
  const name = localized(department.name_fr, department.name_en, locale);
  const doc = locale === "en" && !isEmptyDoc(department.content_en) ? department.content_en : department.content_fr;
  const dims = Object.fromEntries(department.media.map((media) => [media.url, { width: media.width, height: media.height }]));

  // Team photos not already placed inside the description.
  const used = docMediaUrls(doc);
  const photos = department.media
    .filter((media) => !used.has(media.url))
    .map((media) => ({ src: media.url, alt: media.alt || name, caption: media.caption ?? undefined, width: media.width, height: media.height }));
  const showPhotos = department.gallery_mode !== "members" && photos.length > 0;
  const showMembers = department.gallery_mode !== "group" && department.members.length > 0;

  return (
    <div className="space-y-14">
      {department.leader_name && (
        <DepartmentLeader
          name={department.leader_name}
          role={localized(department.leader_role_fr, department.leader_role_en, locale)}
          bio={localized(department.leader_bio_fr, department.leader_bio_en, locale)}
          photoUrl={department.leader_photo_url}
          focus={department.leader_photo_focus}
          label={labels.leader}
        />
      )}

      {isEmptyDoc(doc) ? (
        labels.emptyMission && <p className="mx-auto max-w-3xl px-4 opacity-70 sm:px-6">{labels.emptyMission}</p>
      ) : (
        <section aria-labelledby="mission-title" className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 id="mission-title" className="mb-5 text-2xl font-extrabold text-[var(--event-heading)] sm:text-3xl">
            {labels.mission}
          </h2>
          <EventContent doc={doc} dims={dims} />
        </section>
      )}

      {(showPhotos || showMembers) && (
        <section aria-labelledby="team-title" className="mx-auto max-w-6xl space-y-8 px-4 sm:px-6">
          <h2 id="team-title" className="text-2xl font-extrabold text-[var(--event-heading)] sm:text-3xl">
            {labels.team}
          </h2>
          {showPhotos && <EventGallery images={photos} layout="feature" columns={photos.length - 1 === 2 || photos.length - 1 === 4 ? 2 : 3} />}
          {showMembers && (
            <div>
              {showPhotos && <h3 className="mb-4 text-lg font-extrabold">{labels.members}</h3>}
              <MembersGrid members={department.members} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
