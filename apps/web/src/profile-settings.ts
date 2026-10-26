const KEY = "studyy.profile";

export type ProfileSettings = {
  displayName: string;
  email: string;
  preferredKind: "TRIMESTER" | "SEMESTER";
};

const defaults: ProfileSettings = {
  displayName: "",
  email: "",
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
