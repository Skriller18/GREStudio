import type { Question } from "./types";

const verbal: Omit<Question, "section">[] = [
  { id:"v01",type:"single",stem:"Although the proposal sounded radical, the committee's final recommendation was surprisingly ____.",choices:["conventional","opaque","reckless","hostile","extravagant"],answer:"conventional",explanation:"The contrast with radical calls for a familiar or traditional recommendation." },
  { id:"v02",type:"single",stem:"The historian was careful to ____ her claim, noting that the surviving letters represented only one side of the dispute.",choices:["qualify","inflate","conceal","repudiate","celebrate"],answer:"qualify",explanation:"She limits the force of her claim because the evidence is incomplete." },
  { id:"v03",type:"single",stem:"The new policy was intended to ____ delays, but its complicated approval process made them worse.",choices:["alleviate","catalog","predict","justify","magnify"],answer:"alleviate",explanation:"The contrast indicates that the policy aimed to reduce delays." },
  { id:"v04",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. The scientist's account was deliberately ____, avoiding claims that the limited data could not support.",choices:["cautious","circumspect","flamboyant","dogmatic","ornate","sweeping"],answer:["cautious","circumspect"],explanation:"Cautious and circumspect both describe restraint in making claims." },
  { id:"v05",type:"single",stem:"A temporary surge in sales did little to ____ investors' concerns about the company's long-term debt.",choices:["allay","provoke","document","echo","dismiss"],answer:"allay",explanation:"The surge failed to calm or lessen the concern." },
  { id:"v06",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. What first seemed a ____ detail became crucial when the researchers compared the two records.",choices:["trivial","inconsequential","decisive","striking","novel","urgent"],answer:["trivial","inconsequential"],explanation:"The detail initially appeared unimportant." },
  { id:"v07",type:"single",stem:"Rather than reject the earlier study, the new paper sought to ____ it by adding data from rural communities.",choices:["augment","discredit","obscure","imitate","abandon"],answer:"augment",explanation:"Adding data extends and strengthens the earlier work." },
  { id:"v08",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. The mayor's answers were so ____ that reporters left unsure which plan she supported.",choices:["equivocal","ambiguous","forthright","incisive","definitive","lucid"],answer:["equivocal","ambiguous"],explanation:"Both words mean open to more than one interpretation." },
  { id:"v09",type:"single",stem:"Her criticism was ____: she identified the flaw and proposed a practical way to fix it.",choices:["constructive","perfunctory","caustic","irrelevant","diffuse"],answer:"constructive",explanation:"A useful proposed fix makes the criticism constructive." },
  { id:"v10",type:"single",stem:"Because the document was written for specialists, its terminology was ____ to most first-year students.",choices:["arcane","familiar","precise","pedestrian","redundant"],answer:"arcane",explanation:"Specialist terminology can be obscure to newcomers." },
  { id:"v11",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. The witness remained ____ even under repeated questioning, giving the same clear account each time.",choices:["steadfast","resolute","capricious","evasive","reticent","vacillating"],answer:["steadfast","resolute"],explanation:"Both words convey firmness and consistency." },
  { id:"v12",type:"single",stem:"The archive's records are ____, so the researcher checked the dates against several independent sources.",choices:["fragmentary","exhaustive","uniform","accessible","immutable"],answer:"fragmentary",explanation:"Incomplete records warrant outside checks." },
  { id:"v13",type:"single",stem:"The editor removed the paragraph because it was ____ to the article's central argument.",choices:["tangential","integral","germane","essential","foundational"],answer:"tangential",explanation:"A tangential paragraph has only a slight connection to the argument." },
  { id:"v14",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. Despite the grand title, the report offered a ____ overview of a complex issue.",choices:["cursory","superficial","meticulous","comprehensive","rigorous","exhaustive"],answer:["cursory","superficial"],explanation:"Both indicate a shallow treatment of the issue." },
  { id:"v15",type:"single",stem:"The judge found the explanation ____, since it contradicted three independent accounts.",choices:["implausible","cogent","credible","sufficient","compelling"],answer:"implausible",explanation:"Contradicting independent accounts makes it hard to believe." },
  { id:"v16",type:"single",stem:"The committee praised the plan's ambition but worried that its budget estimates were overly ____.",choices:["optimistic","specific","candid","modest","conservative"],answer:"optimistic",explanation:"Ambitious plans can underestimate costs through optimistic estimates." },
  { id:"v17",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. The novelist's style is ____, with short sentences and little decoration.",choices:["spare","austere","ornate","lavish","circuitous","florid"],answer:["spare","austere"],explanation:"Spare and austere both describe an unadorned style." },
  { id:"v18",type:"single",stem:"The results ____ the team's initial hypothesis: the treatment group improved more than the control group.",choices:["corroborated","undermined","precluded","qualified","obscured"],answer:"corroborated",explanation:"The results supported the hypothesis." },
  { id:"v19",type:"single",stem:"The museum chose to ____ the damaged mural instead of covering it with a new painting.",choices:["restore","replicate","conceal","discard","relocate"],answer:"restore",explanation:"Restoration repairs and preserves the existing mural." },
  { id:"v20",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. His account was ____; it changed each time he described the event.",choices:["inconsistent","contradictory","coherent","meticulous","credible","lucid"],answer:["inconsistent","contradictory"],explanation:"Changing accounts are inconsistent or contradictory." },
  { id:"v21",type:"single",stem:"The city introduced a pilot program to test the idea on a small scale before a ____ rollout.",choices:["comprehensive","tentative","limited","partial","brief"],answer:"comprehensive",explanation:"A small pilot precedes a broad rollout." },
  { id:"v22",type:"single",stem:"The review was neither praise nor dismissal; it offered a ____ assessment of the book's strengths and weaknesses.",choices:["balanced","perfunctory","one-sided","hostile","indiscriminate"],answer:"balanced",explanation:"Considering both strengths and weaknesses is balanced." },
  { id:"v23",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. The discovery was ____: it overturned a theory researchers had accepted for decades.",choices:["momentous","consequential","routine","minor","predictable","trivial"],answer:["momentous","consequential"],explanation:"Both choices describe a discovery with major effects." },
  { id:"v24",type:"single",stem:"Because the evidence remained uncertain, the panel issued a ____ recommendation rather than a firm directive.",choices:["provisional","categorical","binding","permanent","unequivocal"],answer:"provisional",explanation:"A provisional recommendation may change as evidence improves." },
  { id:"v25",type:"single",stem:"The speaker used a familiar example to make an otherwise ____ idea accessible.",choices:["abstract","elementary","obvious","concrete","practical"],answer:"abstract",explanation:"An example can clarify an abstract idea." },
  { id:"v26",type:"multi",stem:"Select TWO words that complete the sentence and produce similar meanings. The policy's language was ____ enough to allow several interpretations.",choices:["vague","imprecise","explicit","unambiguous","exact","specific"],answer:["vague","imprecise"],explanation:"Both words indicate insufficient clarity." },
  { id:"v27",type:"single",stem:"The small trial did not ____ the theory, but it offered enough support to justify a larger study.",choices:["prove","motivate","suggest","frame","examine"],answer:"prove",explanation:"A small trial can support a theory without establishing it conclusively." }
];

const quant: Omit<Question, "section">[] = [];
for (let i = 0; i < 27; i++) {
  const k = i + 1, variant = i % 9, a = 3 + Math.floor(i / 9) * 2 + (i % 3), b = 2 + (i % 4);
  if (variant === 0) {
    const ans = a * b;
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"single",stem:`A box holds ${a} rows of ${b} pencils each. How many pencils are in the box?`,choices:[String(ans-3),String(ans),String(ans+2),String(ans+b+3),String(ans*2)],answer:String(ans),explanation:`Multiply rows by pencils per row: ${a} × ${b} = ${ans}.`});
  } else if (variant === 1) {
    const base = 20 + a * 5, pct = b * 10, ans = base * pct / 100;
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"single",stem:`What is ${pct}% of ${base}?`,choices:[String(ans/2),String(ans),String(ans+5),String(base+ans),String(base)],answer:String(ans),explanation:`${pct}% of ${base} is ${base} × ${pct}/100 = ${ans}.`});
  } else if (variant === 2) {
    const ans = a + b;
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"numeric",stem:`Solve for x: x − ${b} = ${a}. Enter the number.`,answer:String(ans),explanation:`Add ${b} to both sides, so x = ${ans}.`});
  } else if (variant === 3) {
    const ans = 2 * (a+b);
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"single",stem:`A rectangle has length ${a} and width ${b}. What is its perimeter?`,choices:[String(a*b),String(a+b),String(ans),String(ans+2),String(2*a*b)],answer:String(ans),explanation:`Perimeter = 2(length + width) = 2(${a} + ${b}) = ${ans}.`});
  } else if (variant === 4) {
    const values = [a,a+2,a+4], ans = a+2;
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"single",stem:`What is the mean of ${values.join(", ")}?`,choices:[String(a),String(ans),String(a+3),String(a+4),String(a*3)],answer:String(ans),explanation:`The values are evenly spaced, so the mean is the middle value, ${ans}.`});
  } else if (variant === 5) {
    const ans = a * a;
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"numeric",stem:`A square has side length ${a}. What is its area?`,answer:String(ans),explanation:`Area = side² = ${a}² = ${ans}.`});
  } else if (variant === 6) {
    const ans = 3*a;
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"single",stem:`A train travels at ${a} kilometers per hour for 3 hours. How far does it travel?`,choices:[String(a+1),String(a*2),String(ans),String(ans+4),String(ans*2)],answer:String(ans),explanation:`Distance = speed × time = ${a} × 3 = ${ans} kilometers.`});
  } else if (variant === 7) {
    const total = a+b, ans = (a/total).toFixed(3);
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"single",stem:`A bag contains ${a} red and ${b} blue beads. One bead is drawn at random. What is the probability it is red?`,choices:[`${b}/${total}`,`${a}/${total}`,`${a}/${b}`,`1/${total}`,"1"],answer:`${a}/${total}`,explanation:`There are ${a} favorable outcomes among ${total} beads. The probability is ${a}/${total} (about ${ans}).`});
  } else {
    const ans = a*b;
    quant.push({id:`q${String(k).padStart(2,"0")}`,type:"single",stem:`If ${b} identical notebooks cost $${ans}, what is the cost of one notebook?`,choices:[`$${a-1}`,`$${a}`,`$${a+1}`,`$${b}`,`$${ans}`],answer:`$${a}`,explanation:`Divide the total cost by ${b}: $${ans} ÷ ${b} = $${a}.`});
  }
}

export const sections = [
  { title:"Verbal Reasoning 1", minutes:18, count:12 },
  { title:"Quantitative Reasoning 1", minutes:21, count:12 },
  { title:"Verbal Reasoning 2", minutes:23, count:15 },
  { title:"Quantitative Reasoning 2", minutes:26, count:15 },
];
export const questions: Question[] = [
  ...verbal.slice(0,12).map(q=>({...q,section:0})),
  ...quant.slice(0,12).map(q=>({...q,section:1})),
  ...verbal.slice(12).map(q=>({...q,section:2})),
  ...quant.slice(12).map(q=>({...q,section:3})),
];
