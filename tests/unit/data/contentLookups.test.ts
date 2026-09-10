import { describe, expect, it } from "vitest";
import { getAboutGalleryImages } from "@/lib/data/about";
import { collections } from "@/lib/data/collections";
import { designers } from "@/lib/data/designers";
import {
  flagshipDetails,
  flagships,
  getFlagship,
  getFlagshipDetail,
} from "@/lib/data/flagships";
import { getS34GalleryImages } from "@/lib/data/s34";
import { materials } from "@/lib/data/materials";
import { getProjectById, projects } from "@/lib/data/projects";

describe("flagship lookups", () => {
  it("finds a flagship by slug", () => {
    const flagship = getFlagship("henge-milan");
    expect(flagship).toBeDefined();
    expect(flagship?.slug).toBe("henge-milan");
    expect(flagship?.name.en.length).toBeGreaterThan(0);
    expect(flagship?.name.fa.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getFlagship("does-not-exist")).toBeUndefined();
  });

  it("resolves detail content only for flagships that have it", () => {
    const detail = getFlagshipDetail("henge-milan");
    expect(detail).toBeDefined();
    expect(detail?.heading.en.length).toBeGreaterThan(0);

    // london exists as a summary card but has no built detail page yet
    expect(getFlagshipDetail("henge-london")).toBeUndefined();
  });

  it("has unique flagship slugs", () => {
    const slugs = flagships.map((f) => f.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("only references known flagships in the detail content map", () => {
    const knownSlugs = new Set(flagships.map((f) => f.slug));
    for (const slug of Object.keys(flagshipDetails)) {
      expect(knownSlugs.has(slug), `flagshipDetails:${slug}`).toBe(true);
    }
  });
});

describe("project lookups", () => {
  it("finds a project by id", () => {
    const project = getProjectById("h-istra");
    expect(project).toBeDefined();
    expect(project?.name.en).toBe("H Istra");
    expect(project?.name.fa.length).toBeGreaterThan(0);
  });

  it("returns undefined for an unknown id", () => {
    expect(getProjectById("does-not-exist")).toBeUndefined();
  });

  it("has unique project ids and localized content", () => {
    const ids = projects.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const project of projects) {
      expect(project.name.en.length).toBeGreaterThan(0);
      expect(project.name.fa.length).toBeGreaterThan(0);
      expect(project.description.en.length).toBeGreaterThan(0);
      expect(project.portfolioImages.length).toBeGreaterThan(0);
    }
  });
});

describe("collection data", () => {
  it("has unique slugs and follows the id === slug convention", () => {
    const slugs = collections.map((c) => c.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const collection of collections) {
      expect(collection.id).toBe(collection.slug);
      expect(collection.name.en.length).toBeGreaterThan(0);
      expect(collection.name.fa.length).toBeGreaterThan(0);
    }
  });
});

describe("designer data", () => {
  it("has unique slugs and non-empty bios", () => {
    const slugs = designers.map((d) => d.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const designer of designers) {
      expect(designer.bio.length).toBeGreaterThan(0);
    }
  });
});

describe("material data", () => {
  it("has unique ids and localized names", () => {
    const ids = materials.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const material of materials) {
      expect(material.name.en.length).toBeGreaterThan(0);
      expect(material.name.fa.length).toBeGreaterThan(0);
      expect(material.description.fa.length).toBeGreaterThan(0);
    }
  });
});

describe("gallery image helpers", () => {
  it("returns https image URLs for the about page", () => {
    const images = getAboutGalleryImages();
    expect(images.length).toBeGreaterThan(0);
    for (const url of images) {
      expect(url.startsWith("https://")).toBe(true);
    }
  });

  it("returns https image URLs for the S34 page", () => {
    const images = getS34GalleryImages();
    expect(images.length).toBeGreaterThan(0);
    for (const url of images) {
      expect(url.startsWith("https://")).toBe(true);
    }
  });
});