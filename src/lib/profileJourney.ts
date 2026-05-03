import type { Interest, Profile, UserBlock } from "@/types";

export type ProfileRelationStatus =
  | "none"
  | "sent_pending"
  | "received_pending"
  | "accepted"
  | "rejected"
  | "blocked";

interface RelationInput {
  sentInterest?: Interest | null;
  receivedInterest?: Interest | null;
  blocked?: boolean;
}

const hasStatus = (
  status: Interest["status"],
  sentInterest?: Interest | null,
  receivedInterest?: Interest | null
) => sentInterest?.status === status || receivedInterest?.status === status;

export function getProfileRelationStatus({
  sentInterest,
  receivedInterest,
  blocked,
}: RelationInput): ProfileRelationStatus {
  if (blocked) return "blocked";
  if (hasStatus("accepted", sentInterest, receivedInterest)) return "accepted";
  if (receivedInterest?.status === "pending") return "received_pending";
  if (sentInterest?.status === "pending") return "sent_pending";
  if (hasStatus("rejected", sentInterest, receivedInterest)) return "rejected";
  return "none";
}

export function buildProfileRelationMap({
  currentUserId,
  profiles,
  interests,
  blocks,
}: {
  currentUserId: string;
  profiles: Profile[];
  interests: Interest[];
  blocks: UserBlock[];
}) {
  const relationMap: Record<string, ProfileRelationStatus> = {};

  profiles.forEach((profile) => {
    const sentInterest = interests.find(
      (interest) =>
        interest.sender_id === currentUserId && interest.receiver_id === profile.id
    );
    const receivedInterest = interests.find(
      (interest) =>
        interest.sender_id === profile.id && interest.receiver_id === currentUserId
    );
    const blocked = blocks.some(
      (block) =>
        (block.blocker_id === currentUserId && block.blocked_id === profile.id) ||
        (block.blocker_id === profile.id && block.blocked_id === currentUserId)
    );

    relationMap[profile.id] = getProfileRelationStatus({
      sentInterest,
      receivedInterest,
      blocked,
    });
  });

  return relationMap;
}

export function getProfileCompletion(profile?: Profile | null) {
  if (!profile) return 0;

  const checks = [
    profile.name,
    profile.age,
    profile.gender,
    profile.religion,
    profile.city,
    profile.education,
    profile.profession,
    profile.bio,
    profile.avatar_url,
    profile.languages?.length,
    profile.hobbies?.length,
    profile.search_intent,
    profile.family_goals,
    profile.lifestyle_choices,
    Object.values(profile.prompts || {}).some(Boolean),
  ];

  const completed = checks.filter(Boolean).length;
  return Math.round((completed / checks.length) * 100);
}

export function getMatchReasons(profile: Profile, myProfile?: Profile | null) {
  if (!myProfile) return [];

  const reasons: string[] = [];
  const sameCity =
    profile.city?.trim().toLowerCase() === myProfile.city?.trim().toLowerCase();
  const closeAge = Math.abs((profile.age || 0) - (myProfile.age || 0)) <= 3;

  if (sameCity) reasons.push("Same city");
  if (profile.religion && profile.religion === myProfile.religion) {
    reasons.push("Shared faith");
  }
  if (profile.education && profile.education === myProfile.education) {
    reasons.push("Similar education");
  }
  if (profile.profession && profile.profession === myProfile.profession) {
    reasons.push("Similar profession");
  }
  if (closeAge) reasons.push("Similar age");
  if (profile.bio && profile.profession && profile.education) {
    reasons.push("Complete profile");
  }

  return reasons.slice(0, 3);
}
