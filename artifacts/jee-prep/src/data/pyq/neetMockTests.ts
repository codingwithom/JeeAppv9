export interface NeetQuestion {
  questionNo: number;
  qKey: string;
  type: "mcq";
  subject: "physics" | "chemistry" | "botany" | "zoology";
  chapter: string;
  content: string;
  options: Array<{ identifier: string; content: string }>;
  correct_options: string[];
  explanation: string;
  marks: number;
  negMarks: number;
}

export interface NeetMockPaper {
  key: string;
  title: string;
  exam: "neet";
  year: number;
  durationMinutes: number;
  totalMarks: number;
  sections: Array<{
    title: string;
    subjectKey: "physics" | "chemistry" | "botany" | "zoology";
    questions: NeetQuestion[];
  }>;
}

export const NEET_MOCK_TEST_1: NeetMockPaper = {
  key: "neet-ug-2026-grand-all-india-mock-1",
  title: "NEET (UG) 2026 Grand All-India Mock Test - Paper 1",
  exam: "neet",
  year: 2026,
  durationMinutes: 200,
  totalMarks: 720,
  sections: [
    {
      title: "Physics",
      subjectKey: "physics",
      questions: [
        {
          questionNo: 1,
          qKey: "neet-phy-01",
          type: "mcq",
          subject: "physics",
          chapter: "Units and Measurements",
          content: "<p>The dimensions of universal gravitational constant \\(G\\) in terms of base dimensions \\([M]\\), \\([L]\\), and \\([T]\\) are:</p>",
          options: [
            { identifier: "A", content: "\\[[M^{-1} L^3 T^{-2}]\\]" },
            { identifier: "B", content: "\\[[M^1 L^2 T^{-2}]\\]" },
            { identifier: "C", content: "\\[[M^{-2} L^3 T^{-1}]\\]" },
            { identifier: "D", content: "\\[[M^{-1} L^2 T^{-3}]\\]" }
          ],
          correct_options: ["A"],
          explanation: "<p>From Newton's law of gravitation, \\(F = \\frac{G m_1 m_2}{r^2}\\). Hence, \\(G = \\frac{F r^2}{m^2} = \\frac{[M L T^{-2}][L^2]}{[M^2]} = [M^{-1} L^3 T^{-2}]\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 2,
          qKey: "neet-phy-02",
          type: "mcq",
          subject: "physics",
          chapter: "Kinematics",
          content: "<p>A body dropped from the top of a tower of height \\(h\\) reaches the ground with a velocity of \\(20\\text{ m/s}\\). Taking \\(g = 10\\text{ m/s}^2\\), the height \\(h\\) is:</p>",
          options: [
            { identifier: "A", content: "10 m" },
            { identifier: "B", content: "20 m" },
            { identifier: "C", content: "40 m" },
            { identifier: "D", content: "80 m" }
          ],
          correct_options: ["B"],
          explanation: "<p>Using \\(v^2 = u^2 + 2gh\\) with \\(u = 0\\): \\((20)^2 = 2(10)h \\implies 400 = 20h \\implies h = 20\\text{ m}\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 3,
          qKey: "neet-phy-03",
          type: "mcq",
          subject: "physics",
          chapter: "Work, Energy and Power",
          content: "<p>A particle of mass \\(m\\) is moving in a horizontal circle of radius \\(r\\) under a centripetal force \\(F = -\\frac{k}{r^2}\\). The total mechanical energy of the particle is:</p>",
          options: [
            { identifier: "A", content: "\\[-\\frac{k}{2r}\\]" },
            { identifier: "B", content: "\\[-\\frac{k}{r}\\]" },
            { identifier: "C", content: "\\[+\\frac{k}{2r}\\]" },
            { identifier: "D", content: "\\[0\\]" }
          ],
          correct_options: ["A"],
          explanation: "<p>Centripetal force \\(\\frac{mv^2}{r} = \\frac{k}{r^2} \\implies K = \\frac{1}{2}mv^2 = \\frac{k}{2r}\\). Potential energy \\(U = -\\int F dr = -\\int (-\\frac{k}{r^2}) dr = -\\frac{k}{r}\\). Total energy \\(E = K + U = \\frac{k}{2r} - \\frac{k}{r} = -\\frac{k}{2r}\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 4,
          qKey: "neet-phy-04",
          type: "mcq",
          subject: "physics",
          chapter: "Current Electricity",
          content: "<p>Three identical resistors each of resistance \\(R = 6\\,\\Omega\\) are connected in parallel. The equivalent resistance of the combination is:</p>",
          options: [
            { identifier: "A", content: "\\(18\\,\\Omega\\)" },
            { identifier: "B", content: "\\(2\\,\\Omega\\)" },
            { identifier: "C", content: "\\(3\\,\\Omega\\)" },
            { identifier: "D", content: "\\(6\\,\\Omega\\)" }
          ],
          correct_options: ["B"],
          explanation: "<p>For \\(n\\) identical resistors in parallel, \\(R_{\\text{eq}} = \\frac{R}{n} = \\frac{6}{3} = 2\\,\\Omega\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 5,
          qKey: "neet-phy-05",
          type: "mcq",
          subject: "physics",
          chapter: "Modern Physics",
          content: "<p>The de Broglie wavelength of an electron accelerated through a potential difference of \\(V = 100\\text{ Volts}\\) is approximately:</p>",
          options: [
            { identifier: "A", content: "\\(1.227\\text{ \\AA}\\)" },
            { identifier: "B", content: "\\(0.123\\text{ \\AA}\\)" },
            { identifier: "C", content: "\\(12.27\\text{ \\AA}\\)" },
            { identifier: "D", content: "\\(122.7\\text{ \\AA}\\)" }
          ],
          correct_options: ["A"],
          explanation: "<p>For an electron, \\(\\lambda = \\frac{12.27}{\\sqrt{V}}\\text{ \\AA} = \\frac{12.27}{\\sqrt{100}} = 1.227\\text{ \\AA}\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 6,
          qKey: "neet-phy-06",
          type: "mcq",
          subject: "physics",
          chapter: "Optics",
          content: "<p>A convex lens of focal length \\(20\\text{ cm}\\) is placed in contact with a concave lens of focal length \\(40\\text{ cm}\\). The power of the combination is:</p>",
          options: [
            { identifier: "A", content: "\\(+2.5\\text{ D}\\)" },
            { identifier: "B", content: "\\(-2.5\\text{ D}\\)" },
            { identifier: "C", content: "\\(+5.0\\text{ D}\\)" },
            { identifier: "D", content: "\\(+7.5\\text{ D}\\)" }
          ],
          correct_options: ["A"],
          explanation: "<p>\\(P_1 = \\frac{100}{+20} = +5\\text{ D}\\), \\(P_2 = \\frac{100}{-40} = -2.5\\text{ D}\\). Total power \\(P = P_1 + P_2 = +5 - 2.5 = +2.5\\text{ D}\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 7,
          qKey: "neet-phy-07",
          type: "mcq",
          subject: "physics",
          chapter: "Thermodynamics",
          content: "<p>An ideal Carnot engine operates between temperatures \\(T_1 = 500\\text{ K}\\) (source) and \\(T_2 = 300\\text{ K}\\) (sink). Its efficiency \\(\\eta\\) is:</p>",
          options: [
            { identifier: "A", content: "60%" },
            { identifier: "B", content: "40%" },
            { identifier: "C", content: "50%" },
            { identifier: "D", content: "20%" }
          ],
          correct_options: ["B"],
          explanation: "<p>\\(\\eta = 1 - \\frac{T_2}{T_1} = 1 - \\frac{300}{500} = 1 - 0.6 = 0.4 = 40\\%\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 8,
          qKey: "neet-phy-08",
          type: "mcq",
          subject: "physics",
          chapter: "Semiconductors",
          content: "<p>In an unbiased \\(p\\)-\\(n\\) junction, holes diffuse from the \\(p\\)-region to \\(n\\)-region because:</p>",
          options: [
            { identifier: "A", content: "The electric field across the junction pushes them" },
            { identifier: "B", content: "Hole concentration in \\(p\\)-region is more than in \\(n\\)-region" },
            { identifier: "C", content: "They are attracted by positive charges in \\(n\\)-region" },
            { identifier: "D", content: "Free electrons push them into the \\(n\\)-region" }
          ],
          correct_options: ["B"],
          explanation: "<p>Diffusion is purely driven by concentration gradient from high concentration region to lower concentration region.</p>",
          marks: 4,
          negMarks: 1
        }
      ]
    },
    {
      title: "Chemistry",
      subjectKey: "chemistry",
      questions: [
        {
          questionNo: 9,
          qKey: "neet-chem-01",
          type: "mcq",
          subject: "chemistry",
          chapter: "Some Basic Concepts of Chemistry",
          content: "<p>The number of moles of hydrogen atoms present in \\(3.4\\text{ g}\\) of ammonia (\\(\\text{NH}_3\\)) is: [Molar mass of \\(\\text{NH}_3 = 17\\text{ g/mol}\\)]</p>",
          options: [
            { identifier: "A", content: "0.2 mol" },
            { identifier: "B", content: "0.6 mol" },
            { identifier: "C", content: "1.2 mol" },
            { identifier: "D", content: "0.4 mol" }
          ],
          correct_options: ["B"],
          explanation: "<p>Moles of \\(\\text{NH}_3 = \\frac{3.4}{17} = 0.2\\text{ mol}\\). Each mole of \\(\\text{NH}_3\\) contains 3 moles of \\(\\text{H}\\) atoms, so total \\(\\text{H}\\) moles = \\(0.2 \\times 3 = 0.6\\text{ mol}\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 10,
          qKey: "neet-chem-02",
          type: "mcq",
          subject: "chemistry",
          chapter: "Chemical Bonding",
          content: "<p>According to VSEPR theory, the geometry and hybridisation of \\(\\text{SF}_4\\) molecule are:</p>",
          options: [
            { identifier: "A", content: "Tetrahedral, \\(sp^3\\)" },
            { identifier: "B", content: "See-saw, \\(sp^3d\\)" },
            { identifier: "C", content: "Square planar, \\(sp^3d^2\\)" },
            { identifier: "D", content: "Trigonal bipyramidal, \\(sp^3d\\)" }
          ],
          correct_options: ["B"],
          explanation: "<p>Sulfur has 6 valence electrons; 4 bonding pairs + 1 lone pair = steric number 5 (\\(sp^3d\\) hybridisation). The shape with 1 lone pair is see-saw.</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 11,
          qKey: "neet-chem-03",
          type: "mcq",
          subject: "chemistry",
          chapter: "Coordination Compounds",
          content: "<p>Which of the following complexes is diamagnetic?</p>",
          options: [
            { identifier: "A", content: "\\[[\\text{Fe}(\\text{CN})_6]^{4-}\\]" },
            { identifier: "B", content: "\\[[\\text{FeF}_6]^{3-}\\]" },
            { identifier: "C", content: "\\[[\\text{CoF}_6]^{3-}\\]" },
            { identifier: "D", content: "\\[[\\text{NiCl}_4]^{2-}\\]" }
          ],
          correct_options: ["A"],
          explanation: "<p>In \\([\\text{Fe}(\\text{CN})_6]^{4-}\\), \\(\\text{Fe}^{2+}\\) is \\(3d^6\\). Cyanide is a strong field ligand, causing pairing \\(t_{2g}^6 e_g^0\\), resulting in 0 unpaired electrons (diamagnetic).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 12,
          qKey: "neet-chem-04",
          type: "mcq",
          subject: "chemistry",
          chapter: "Organic Chemistry",
          content: "<p>Cannizzaro's reaction is not given by:</p>",
          options: [
            { identifier: "A", content: "Formaldehyde (\\(\\text{HCHO}\\))" },
            { identifier: "B", content: "Benzaldehyde (\\(\\text{C}_6\\text{H}_5\\text{CHO}\\))" },
            { identifier: "C", content: "Acetaldehyde (\\(\\text{CH}_3\\text{CHO}\\))" },
            { identifier: "D", content: "Trimethylacetaldehyde (\\((\\text{CH}_3)_3\\text{C-CHO}\\))" }
          ],
          correct_options: ["C"],
          explanation: "<p>Cannizzaro reaction requires aldehydes with NO \\(\\alpha\\)-hydrogen atoms. Acetaldehyde has 3 \\(\\alpha\\)-hydrogens and undergoes aldol condensation instead.</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 13,
          qKey: "neet-chem-05",
          type: "mcq",
          subject: "chemistry",
          chapter: "Equilibrium",
          content: "<p>The pH of a \\(10^{-8}\\text{ M}\\) \\(\\text{HCl}\\) aqueous solution at \\(25^\\circ\\text{C}\\) is:</p>",
          options: [
            { identifier: "A", content: "8.0" },
            { identifier: "B", content: "Between 6.9 and 7.0" },
            { identifier: "C", content: "7.0" },
            { identifier: "D", content: "Between 7.0 and 8.0" }
          ],
          correct_options: ["B"],
          explanation: "<p>Since the acid is very dilute, \\([\\text{H}^+]\\) from water must be accounted for: \\([\\text{H}^+] = 10^{-8} + 10^{-7} \\approx 1.1 \\times 10^{-7}\\text{ M}\\). \\(\\text{pH} = -\\log(1.1 \\times 10^{-7}) \\approx 6.96\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 14,
          qKey: "neet-chem-06",
          type: "mcq",
          subject: "chemistry",
          chapter: "Electrochemistry",
          content: "<p>During electrolysis of aqueous \\(\\text{NaCl}\\), the product obtained at the cathode is:</p>",
          options: [
            { identifier: "A", content: "\\(\\text{Na}\\text{ metal}\\)" },
            { identifier: "B", content: "\\(\\text{Cl}_2\\text{ gas}\\)" },
            { identifier: "C", content: "\\(\\text{H}_2\\text{ gas}\\)" },
            { identifier: "D", content: "\\(\\text{O}_2\\text{ gas}\\)" }
          ],
          correct_options: ["C"],
          explanation: "<p>At the cathode, reduction of water (\\(2\\text{H}_2\\text{O} + 2e^- \\to \\text{H}_2 + 2\\text{OH}^-\\)) occurs in preference to \\(\\text{Na}^+\\) reduction due to higher reduction potential.</p>",
          marks: 4,
          negMarks: 1
        }
      ]
    },
    {
      title: "Botany",
      subjectKey: "botany",
      questions: [
        {
          questionNo: 15,
          qKey: "neet-bot-01",
          type: "mcq",
          subject: "botany",
          chapter: "Plant Kingdom",
          content: "<p>Gymnosperms are referred to as 'naked seeded plants' because their ovules are:</p>",
          options: [
            { identifier: "A", content: "Lacking integuments" },
            { identifier: "B", content: "Not enclosed inside an ovary wall" },
            { identifier: "C", content: "Developed inside an open carpel" },
            { identifier: "D", content: "Devoid of endosperm" }
          ],
          correct_options: ["B"],
          explanation: "<p>In gymnosperms, the ovules are not enclosed by any ovary wall and remain exposed both before and after fertilisation.</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 16,
          qKey: "neet-bot-02",
          type: "mcq",
          subject: "botany",
          chapter: "Photosynthesis in Higher Plants",
          content: "<p>In \\(\\text{C}_4\\) plants, the primary \\(\\text{CO}_2\\) acceptor is:</p>",
          options: [
            { identifier: "A", content: "Phosphoenol pyruvate (PEP)" },
            { identifier: "B", content: "Ribulose 1,5-bisphosphate (RuBP)" },
            { identifier: "C", content: "Oxaloacetic acid (OAA)" },
            { identifier: "D", content: "Phosphoglyceric acid (PGA)" }
          ],
          correct_options: ["A"],
          explanation: "<p>In \\(\\text{C}_4\\) plants, \\(\\text{CO}_2\\) is fixed in mesophyll cells by Phosphoenolpyruvate (PEP) catalysed by PEP carboxylase.</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 17,
          qKey: "neet-bot-03",
          type: "mcq",
          subject: "botany",
          chapter: "Cell: The Unit of Life",
          content: "<p>Which of the following cell organelles is bounded by a single unit membrane?</p>",
          options: [
            { identifier: "A", content: "Mitochondria" },
            { identifier: "B", content: "Chloroplast" },
            { identifier: "C", content: "Lysosome" },
            { identifier: "D", content: "Nucleus" }
          ],
          correct_options: ["C"],
          explanation: "<p>Lysosomes, peroxisomes, and vacuoles are single membrane-bound. Mitochondria, chloroplasts, and nucleus have double membranes.</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 18,
          qKey: "neet-bot-04",
          type: "mcq",
          subject: "botany",
          chapter: "Genetics and Evolution",
          content: "<p>In Mendel's dihybrid cross with homozygous tall round (TTRR) and dwarf wrinkled (ttrr) pea plants, the proportion of \\(F_2\\) generation showing recombinant phenotypes is:</p>",
          options: [
            { identifier: "A", content: "9/16" },
            { identifier: "B", content: "6/16 (or 3/8)" },
            { identifier: "C", content: "1/16" },
            { identifier: "D", content: "10/16" }
          ],
          correct_options: ["B"],
          explanation: "<p>Parental types are Tall Round (9/16) and Dwarf Wrinkled (1/16). Recombinant types are Tall Wrinkled (3/16) + Dwarf Round (3/16) = 6/16 = 3/8.</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 19,
          qKey: "neet-bot-05",
          type: "mcq",
          subject: "botany",
          chapter: "Plant Growth and Development",
          content: "<p>The plant growth regulator responsible for 'bolting' (internode elongation just prior to flowering in rosette plants) is:</p>",
          options: [
            { identifier: "A", content: "Auxin" },
            { identifier: "B", content: "Gibberellin" },
            { identifier: "C", content: "Cytokinin" },
            { identifier: "D", content: "Abscisic Acid" }
          ],
          correct_options: ["B"],
          explanation: "<p>Gibberellins promote bolting in cabbage, beet, and many plants with rosette habit.</p>",
          marks: 4,
          negMarks: 1
        }
      ]
    },
    {
      title: "Zoology",
      subjectKey: "zoology",
      questions: [
        {
          questionNo: 20,
          qKey: "neet-zoo-01",
          type: "mcq",
          subject: "zoology",
          chapter: "Human Physiology: Circulation",
          content: "<p>In an electrocardiogram (ECG), the \\(\\text{T}\\)-wave represents:</p>",
          options: [
            { identifier: "A", content: "Depolarisation of atria" },
            { identifier: "B", content: "Depolarisation of ventricles" },
            { identifier: "C", content: "Repolarisation of ventricles" },
            { identifier: "D", content: "Repolarisation of atria" }
          ],
          correct_options: ["C"],
          explanation: "<p>P-wave = Depolarisation of atria; QRS complex = Depolarisation of ventricles; T-wave = Repolarisation of ventricles (return to resting state).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 21,
          qKey: "neet-zoo-02",
          type: "mcq",
          subject: "zoology",
          chapter: "Animal Kingdom",
          content: "<p>Which of the following animals exhibits bilateral symmetry, triploblastic condition, and pseudocoelomate body plan?</p>",
          options: [
            { identifier: "A", content: "Ascaris (Roundworm)" },
            { identifier: "B", content: "Taenia (Tapeworm)" },
            { identifier: "C", content: "Fasciola (Liver fluke)" },
            { identifier: "D", content: "Pheretima (Earthworm)" }
          ],
          correct_options: ["A"],
          explanation: "<p>Aschelminthes (like Ascaris / Wuchereria) are pseudocoelomates, bilaterally symmetrical, and triploblastic.</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 22,
          qKey: "neet-zoo-03",
          type: "mcq",
          subject: "zoology",
          chapter: "Human Reproduction",
          content: "<p>The hormone responsible for triggering ovulation during the menstrual cycle is a rapid surge of:</p>",
          options: [
            { identifier: "A", content: "Progesterone" },
            { identifier: "B", content: "LH (Luteinizing Hormone)" },
            { identifier: "C", content: "FSH (Follicle Stimulating Hormone)" },
            { identifier: "D", content: "Prolactin" }
          ],
          correct_options: ["B"],
          explanation: "<p>Rapid secretion of LH leading to its maximum level during the mid-cycle (called LH surge) induces rupture of Graafian follicle and release of ovum (ovulation).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 23,
          qKey: "neet-zoo-04",
          type: "mcq",
          subject: "zoology",
          chapter: "Human Physiology: Excretion",
          content: "<p>The counter-current mechanism for concentration of urine operates between:</p>",
          options: [
            { identifier: "A", content: "Henle's loop and Vasa recta" },
            { identifier: "B", content: "Bowman's capsule and Glomerulus" },
            { identifier: "C", content: "PCT and DCT" },
            { identifier: "D", content: "Afferent and Efferent arteriole" }
          ],
          correct_options: ["A"],
          explanation: "<p>The proximity between Henle's loop and Vasa recta, and the counter current flow of filtrate in Henle's loop and blood in Vasa recta, maintain the medullary osmotic gradient.</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 24,
          qKey: "neet-zoo-05",
          type: "mcq",
          subject: "zoology",
          chapter: "Biotechnology: Principles and Processes",
          content: "<p>The enzyme commonly known as 'molecular scissors' in genetic engineering is:</p>",
          options: [
            { identifier: "A", content: "DNA Ligase" },
            { identifier: "B", content: "Restriction Endonuclease" },
            { identifier: "C", content: "DNA Polymerase" },
            { identifier: "D", content: "Alkaline Phosphatase" }
          ],
          correct_options: ["B"],
          explanation: "<p>Restriction endonucleases cleave DNA at specific palindrome recognition sequences and are known as molecular scissors.</p>",
          marks: 4,
          negMarks: 1
        }
      ]
    }
  ]
};

export const NEET_MOCK_TEST_2: NeetMockPaper = {
  key: "neet-ug-2025-shift-1-replica",
  title: "NEET (UG) 2025 Shift 1 Official Replica Test",
  exam: "neet",
  year: 2025,
  durationMinutes: 200,
  totalMarks: 720,
  sections: [
    {
      title: "Physics",
      subjectKey: "physics",
      questions: [
        {
          questionNo: 1,
          qKey: "neet25-phy-01",
          type: "mcq",
          subject: "physics",
          chapter: "Electrostatics",
          content: "<p>Two point charges \\(+4\\,\\mu\\text{C}\\) and \\(-1\\,\\mu\\text{C}\\) are placed \\(30\\text{ cm}\\) apart. The point on the line joining them where the electric potential is zero (measured from the smaller charge) is:</p>",
          options: [
            { identifier: "A", content: "6 cm" },
            { identifier: "B", content: "10 cm" },
            { identifier: "C", content: "15 cm" },
            { identifier: "D", content: "20 cm" }
          ],
          correct_options: ["A"],
          explanation: "<p>\\(\\frac{4}{30 - x} + \\frac{-1}{x} = 0 \\implies \\frac{4}{30-x} = \\frac{1}{x} \\implies 4x = 30 - x \\implies 5x = 30 \\implies x = 6\\text{ cm}\\).</p>",
          marks: 4,
          negMarks: 1
        },
        {
          questionNo: 2,
          qKey: "neet25-phy-02",
          type: "mcq",
          subject: "physics",
          chapter: "Magnetism",
          content: "<p>A proton and an \\(\\alpha\\)-particle enter a uniform perpendicular magnetic field with the same kinetic energy. The ratio of their orbital radii \\(\\frac{r_p}{r_\\alpha}\\) is:</p>",
          options: [
            { identifier: "A", content: "1 : 1" },
            { identifier: "B", content: "1 : 2" },
            { identifier: "C", content: "2 : 1" },
            { identifier: "D", content: "1 : 4" }
          ],
          correct_options: ["A"],
          explanation: "<p>Radius \\(r = \\frac{\\sqrt{2mK}}{qB}\\). \\(\\frac{r_p}{r_\\alpha} = \\frac{\\sqrt{m_p}/q_p}{\\sqrt{m_\\alpha}/q_\\alpha} = \\frac{\\sqrt{m}/q}{\\sqrt{4m}/(2q)} = \\frac{1}{2/2} = 1\\).</p>",
          marks: 4,
          negMarks: 1
        }
      ]
    },
    {
      title: "Chemistry",
      subjectKey: "chemistry",
      questions: [
        {
          questionNo: 3,
          qKey: "neet25-chem-01",
          type: "mcq",
          subject: "chemistry",
          chapter: "Solutions",
          content: "<p>An aqueous solution of urea has a freezing point of \\(-0.372^\\circ\\text{C}\\). Given \\(K_f\\) for water is \\(1.86\\text{ K kg mol}^{-1}\\), the molality of the solution is:</p>",
          options: [
            { identifier: "A", content: "0.1 m" },
            { identifier: "B", content: "0.2 m" },
            { identifier: "C", content: "0.4 m" },
            { identifier: "D", content: "0.5 m" }
          ],
          correct_options: ["B"],
          explanation: "<p>\\(\\Delta T_f = K_f \\cdot m \\implies 0.372 = 1.86 \\times m \\implies m = \\frac{0.372}{1.86} = 0.2\\text{ m}\\).</p>",
          marks: 4,
          negMarks: 1
        }
      ]
    },
    {
      title: "Botany",
      subjectKey: "botany",
      questions: [
        {
          questionNo: 4,
          qKey: "neet25-bot-01",
          type: "mcq",
          subject: "botany",
          chapter: "Morphology of Flowering Plants",
          content: "<p>In mustard and argemone, the type of placentation is:</p>",
          options: [
            { identifier: "A", content: "Axile" },
            { identifier: "B", content: "Parietal" },
            { identifier: "C", content: "Free central" },
            { identifier: "D", content: "Basal" }
          ],
          correct_options: ["B"],
          explanation: "<p>In parietal placentation, ovules develop on inner wall of ovary or peripheral part. Examples: Mustard, Argemone.</p>",
          marks: 4,
          negMarks: 1
        }
      ]
    },
    {
      title: "Zoology",
      subjectKey: "zoology",
      questions: [
        {
          questionNo: 5,
          qKey: "neet25-zoo-01",
          type: "mcq",
          subject: "zoology",
          chapter: "Human Health and Disease",
          content: "<p>Antibodies present in colostrum which protect the newborn infant from various infections are of which type?</p>",
          options: [
            { identifier: "A", content: "IgG" },
            { identifier: "B", content: "IgA" },
            { identifier: "C", content: "IgM" },
            { identifier: "D", content: "IgE" }
          ],
          correct_options: ["B"],
          explanation: "<p>Colostrum contains abundant secretory antibodies (IgA) to shield the infant against gastrointestinal and respiratory pathogens.</p>",
          marks: 4,
          negMarks: 1
        }
      ]
    }
  ]
};
