const KEY = "studyy.profile";

export type ProfileSettings = {
  displayName: string;
  email: string;
  studyType: "university" | "school" | "course" | "language" | "other";
  preferredKind: "TRIMESTER" | "SEMESTER" | "CUSTOM";
};

const defaults: ProfileSettings = {
  displayName: "",
  email: "",
  studyType: "university",
  preferredKind: "TRIMESTER",
};

export function loadProfile(): ProfileSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return { ...defaults };
  }
}

export function saveProfile(next: ProfileSettings) {
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("studyy-profile-updated"));
}
