import type { PreviewView } from "./photoPreview";

/**
 * Hand-authored projections of each placement's print file onto the snapshot
 * product photos (coordinates in photo pixels). `uv` is the part of the print
 * file that is the visible panel (print files include bleed and, for cut & sew,
 * the collar/cuff pieces). Tune with /dev/preview/<slug>.
 */
export const PHOTO_PREVIEWS: Record<number, PreviewView[]> = {
  // All-Over Print Men's Rash Guard — on-model front, 700×1000
  301: [
    {
      id: "model-front",
      label: "Front",
      photo: "/printful/assets/a53ea04bd9fabbb5.jpg",
      layers: [
        {
          // body panel: bounded by the raglan seams (collar → armpits) and the side seams
          placement: "front",
          uv: [0.06, 0.13, 0.94, 0.96],
          quad: [[212, 258], [488, 258], [502, 795], [203, 795]],
          mask: [[283, 252], [417, 252], [494, 432], [502, 800], [203, 800], [206, 432]],
        },
        {
          // raglan sleeve = shoulder + arm (wearer's right = viewer's left)
          placement: "sleeve_right",
          uv: [0.19, 0.04, 0.81, 0.96],
          quad: [[150, 250], [325, 300], [205, 792], [70, 765]],
          mask: [[283, 250], [225, 256], [180, 290], [138, 380], [100, 470], [84, 580], [86, 700], [110, 780], [176, 795], [200, 700], [206, 560], [206, 432]],
        },
        {
          placement: "sleeve_left",
          uv: [0.19, 0.04, 0.81, 0.96],
          quad: [[375, 300], [550, 250], [630, 765], [495, 792]],
          mask: [[417, 250], [475, 256], [522, 290], [565, 380], [602, 470], [614, 580], [608, 700], [588, 780], [524, 795], [500, 700], [494, 560], [494, 432]],
        },
      ],
    },
  ],
  // Women's Long Sleeve Pajama Top — on-model front, 700×1000
  827: [
    {
      id: "model-front",
      label: "Front",
      photo: "/printful/assets/b6c989ea4735b03d.jpg",
      layers: [
        {
          placement: "front",
          uv: [0.08, 0.12, 0.92, 0.95],
          quad: [[205, 290], [495, 290], [515, 818], [185, 818]],
          mask: [[300, 286], [420, 286], [495, 300], [500, 430], [498, 600], [514, 818], [182, 818], [190, 600], [205, 430], [210, 300]],
        },
        {
          // set-in sleeve, wearer's right = viewer's left
          placement: "sleeve_right",
          uv: [0.18, 0.05, 0.82, 0.95],
          quad: [[140, 275], [265, 300], [245, 900], [60, 880]],
          mask: [[300, 285], [215, 290], [160, 320], [118, 450], [95, 600], [84, 760], [98, 870], [212, 888], [232, 760], [230, 600], [218, 450], [205, 330]],
        },
        {
          placement: "sleeve_left",
          uv: [0.18, 0.05, 0.82, 0.95],
          quad: [[435, 300], [560, 275], [640, 880], [455, 900]],
          mask: [[400, 285], [485, 290], [540, 320], [582, 450], [605, 600], [616, 760], [602, 870], [488, 888], [468, 760], [470, 600], [482, 450], [495, 330]],
        },
      ],
    },
  ],
  // Basic Pillow — flat front, 700×1000
  83: [
    {
      id: "front",
      label: "Front",
      photo: "/printful/assets/a5fe80c67feef0e6.jpg",
      layers: [{ placement: "front", quad: [[162, 318], [538, 318], [540, 692], [160, 692]], mask: [[150, 310], [550, 310], [550, 700], [150, 700]] }],
    },
  ],
  // Oversized Cotton Sweatshirt — flat lay, 700×1000
  1590: [
    {
      id: "flat-front",
      label: "Front",
      photo: "/printful/assets/bae9c9a15f9521e9.jpg",
      layers: [
        {
          placement: "front_dtfabric",
          uv: [0.1, 0.08, 0.9, 0.94],
          quad: [[172, 230], [528, 230], [525, 765], [175, 765]],
          mask: [[260, 215], [440, 215], [500, 240], [540, 340], [528, 740], [520, 775], [180, 775], [172, 740], [160, 340], [200, 240]],
        },
        {
          placement: "sleeve_right_dtfabric",
          uv: [0.2, 0.1, 0.8, 0.9],
          quad: [[120, 260], [215, 300], [110, 790], [20, 760]],
          mask: [[255, 215], [200, 240], [160, 340], [172, 740], [100, 800], [25, 790], [15, 700], [110, 420]],
        },
        {
          placement: "sleeve_left_dtfabric",
          uv: [0.2, 0.1, 0.8, 0.9],
          quad: [[485, 300], [580, 260], [680, 760], [590, 790]],
          mask: [[445, 215], [500, 240], [540, 340], [528, 740], [600, 800], [675, 790], [685, 700], [590, 420]],
        },
      ],
    },
  ],
  // Boxy Football Jersey — on-model front, 600×600
  1367: [
    {
      id: "model-front",
      label: "Front",
      photo: "/printful/assets/e77827474ae3bac5.png",
      layers: [
        {
          // boxy body incl. the shoulder yoke; sleeve seams at x≈175 / 425
          placement: "front",
          uv: [0.07, 0.03, 0.93, 0.97],
          quad: [[165, 166], [435, 166], [415, 508], [170, 508]],
          mask: [[255, 168], [345, 168], [398, 178], [425, 200], [420, 330], [410, 506], [172, 506], [168, 330], [180, 195]],
        },
        {
          placement: "sleeve_right",
          uv: [0.2, 0.05, 0.8, 0.95],
          quad: [[135, 168], [245, 186], [190, 362], [78, 342]],
          mask: [[255, 168], [180, 195], [168, 330], [176, 342], [126, 348], [94, 322], [110, 250], [148, 196]],
        },
        {
          placement: "sleeve_left",
          uv: [0.2, 0.05, 0.8, 0.95],
          quad: [[355, 186], [465, 168], [522, 342], [410, 362]],
          mask: [[345, 168], [425, 200], [432, 330], [424, 342], [474, 348], [506, 322], [490, 250], [452, 196]],
        },
      ],
    },
  ],
  // Minimalist Backpack — 3/4 view, 700×1000
  389: [
    {
      id: "front",
      label: "Front",
      photo: "/printful/assets/52511cf670fdf488.jpg",
      layers: [
        {
          placement: "front",
          uv: [0.03, 0.03, 0.97, 0.98],
          quad: [[300, 225], [592, 232], [585, 835], [312, 845]],
          mask: [[300, 225], [420, 205], [540, 215], [592, 240], [585, 835], [312, 845]],
        },
      ],
      surface: { minLum: 110, maxSat: 0.25 },
    },
  ],
};
