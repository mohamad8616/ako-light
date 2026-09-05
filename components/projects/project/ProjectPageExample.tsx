import ProjectTextImageSection from "./ProjectTextImageSection";
import ProjectFullImageSection from "./ProjectFullImageSection";

// Placeholder copy/images matching the screenshots — swap for the real
// PurPur case study content.
export default function ProjectPageExample() {
  return (
    <main className="bg-stone-950">
      <ProjectFullImageSection
        image="https://www.henge07.com/app/uploads/2024/06/Henge_SR24_67-1.jpg"
        caption="A custom winery partition, another key intervention by PurPur, exemplifies their ability to merge utility with narrative design. Integrating a backlit stone feature into the kitchen's core."
      />

      <ProjectTextImageSection
        image="https://www.henge07.com/app/uploads/2024/06/Henge_SR24_73-2.jpg"
        text="Under PurPur's direction, this sculptural piece transcends functionality: the translucent stone, backlit to reveal its intricate veining, becomes a glowing focal point that anchors the open living space. Surrounding kitchen units finished in H-Pale Gold with recessed doors continue the studio's pursuit of refined restraint—where minimal gestures and immaculate craftsmanship speak louder than ornament."
      />

      {/* Next section in the sequence would flip sides: */}
      {/* <ProjectTextImageSection reverse image="..." text="..." /> */}
    </main>
  );
}
