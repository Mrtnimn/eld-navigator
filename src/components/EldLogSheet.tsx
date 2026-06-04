import type { DayLog, DutyStatus } from "@/lib/hos";
import { fmtHM } from "@/lib/hos";

/**
 * DOT Driver's Daily Log — modeled after the J.J. Keller paper log book.
 * Drawn entirely as inline SVG so it prints / exports cleanly.
 */

const ROWS: { key: DutyStatus; n: number; label: string }[] = [
  { key: "off", n: 1, label: "OFF DUTY" },
  { key: "sleeper", n: 2, label: "SLEEPER\u00A0BERTH" },
  { key: "driving", n: 3, label: "DRIVING" },
  { key: "onDuty", n: 4, label: "ON DUTY\n(NOT DRIVING)" },
];

interface Props {
  day: DayLog;
  driverName?: string;
  driverInitials?: string;
  driverNumber?: string;
  truckNumber?: string;
  trailerNumber?: string;
  carrier?: string;
  homeTerminal?: string;
  shipper?: string;
  commodity?: string;
  loadNo?: string;
  fromTo?: string;
  date?: Date;
  startOdometer?: number;
}

const BLUE = "#1d4ed8"; // form ink
const FILL = "#ffffff";

export function EldLogSheet({
  day,
  driverName = "Driver Name",
  driverInitials = "",
  driverNumber = "",
  truckNumber = "",
  trailerNumber = "",
  carrier = "Carrier Co.",
  homeTerminal = "",
  shipper = "",
  commodity = "",
  loadNo = "",
  date = new Date(),
  startOdometer = 0,
}: Props) {
  // Canvas
  const W = 1040;
  const H = 720;

  // Grid geometry
  const gx = 110;
  const gy = 280;
  const gw = 720;
  const gh = 200;
  const colW = gw / 24;
  const rowH = gh / 4;

  const rowY = (key: DutyStatus) => {
    const idx = ROWS.findIndex((r) => r.key === key);
    return gy + idx * rowH + rowH / 2;
  };
  const xAt = (min: number) => gx + (min / 60) * colW;

  // Build duty status path
  const path: string[] = [];
  let prevY: number | null = null;
  for (const seg of day.segments) {
    const y = rowY(seg.status);
    const x1 = xAt(seg.start);
    const x2 = xAt(seg.end);
    if (prevY === null) path.push(`M ${x1} ${y}`);
    else path.push(`L ${x1} ${prevY}`, `L ${x1} ${y}`);
    path.push(`L ${x2} ${y}`);
    prevY = y;
  }

  // Date parts
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);

  // Remarks: pickup/dropoff/fuel/rest labels with location callouts
  const remarks = day.segments
    .filter((s) => s.label && !["Driving", "Off duty"].includes(s.label))
    .map((s) => ({ x: xAt(s.start), label: s.label! }));

  // Total driving miles today
  const totalMiles = day.miles;
  const endOdo = startOdometer + totalMiles;

  return (
    <div className="bg-white text-slate-900 rounded-lg shadow-card overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
      >
        <rect x={0} y={0} width={W} height={H} fill={FILL} />

        {/* ============ HEADER LEFT BLOCK ============ */}
        <Label x={32} y={36} bold>Driver Number</Label>
        <BoxRow x={150} y={20} count={7} value={driverNumber} />

        <Label x={32} y={78} bold>Driver&apos;s Initials</Label>
        <BoxRow x={150} y={62} count={2} value={driverInitials} />

        {/* Signature line */}
        <text x={48} y={120} fontSize={20} fill="#0f172a" fontStyle="italic" fontFamily="cursive">
          {driverName}
        </text>
        <line x1={32} y1={132} x2={400} y2={132} stroke={BLUE} strokeWidth={1} />
        <Label x={32} y={148}>(DRIVER&apos;S SIGNATURE IN FULL) I certify these entries are true and correct.</Label>

        <Label x={32} y={196}>(NAME OF CO-DRIVER)</Label>
        <line x1={32} y1={188} x2={300} y2={188} stroke={BLUE} strokeWidth={1} />

        <text x={32} y={228} fontSize={18} fontWeight={700} fill="#0f172a">{homeTerminal || "—"}</text>
        <line x1={32} y1={236} x2={400} y2={236} stroke={BLUE} strokeWidth={1} />
        <Label x={32} y={252}>(HOME OPERATING CENTER AND ADDRESS)</Label>

        {/* ============ HEADER CENTER ============ */}
        <text x={W / 2} y={36} fontSize={18} fontWeight={800} fill={BLUE} textAnchor="middle">
          DRIVER&apos;S DAILY LOG
        </text>
        <text x={W / 2} y={52} fontSize={9} fill={BLUE} textAnchor="middle">
          (ONE CALENDAR DAY · 24 HOURS)
        </text>
        <text x={W / 2} y={66} fontSize={9} fill={BLUE} textAnchor="middle" fontStyle="italic">
          Cycle: 70 hr. / 8 day
        </text>

        <text x={420} y={102} fontSize={11} fontWeight={700} fill="#0f172a">P</text>
        <line x1={432} y1={104} x2={520} y2={104} stroke={BLUE} />
        <text x={476} y={102} fontSize={11} fontWeight={700} fill="#0f172a" textAnchor="middle">{truckNumber}</text>
        <text x={524} y={102} fontSize={11} fontWeight={700} fill="#0f172a">/T</text>
        <line x1={538} y1={104} x2={640} y2={104} stroke={BLUE} />
        <text x={589} y={102} fontSize={11} fontWeight={700} fill="#0f172a" textAnchor="middle">{trailerNumber}</text>
        <Label x={420} y={118}>VEHICLE NUMBERS · (SHOW EACH UNIT)</Label>

        <text x={W / 2} y={170} fontSize={13} fontWeight={700} fill={BLUE} textAnchor="middle" textDecoration="underline">
          {carrier}
        </text>
        <text x={W / 2} y={188} fontSize={11} fill={BLUE} textAnchor="middle">
          Safety Records Maintained In {homeTerminal || "—"}
        </text>

        {/* Total miles today + truck mileage */}
        <BoxRow x={680} y={86} count={3} value={String(totalMiles).padStart(3, "0")} />
        <Label x={680} y={142}>(TOTAL DRIVING MILES TODAY)</Label>

        <BoxRow x={680} y={170} count={4} value={String(endOdo).padStart(4, "0")} />
        <Label x={680} y={226}>(TOTAL TRUCK MILEAGE TODAY)</Label>

        {/* ============ HEADER RIGHT — DATE ============ */}
        <Label x={832} y={20} bold>ORIGINAL — Submit to carrier</Label>
        <Label x={832} y={32}>DUPLICATE — Driver retain</Label>

        <BoxRow x={840} y={48} count={2} value={mm} />
        <BoxRow x={898} y={48} count={2} value={dd} />
        <BoxRow x={956} y={48} count={2} value={yy} />
        <Label x={848} y={104}>(MONTH)</Label>
        <Label x={902} y={104}>(DAY)</Label>
        <Label x={962} y={104}>(YEAR)</Label>

        {/* ============ GRID ============ */}
        <rect x={gx} y={gy} width={gw} height={gh} fill={FILL} stroke={BLUE} strokeWidth={1.5} />

        {/* Vertical hour columns */}
        {Array.from({ length: 25 }).map((_, h) => {
          const x = gx + h * colW;
          return (
            <line key={`v${h}`} x1={x} y1={gy} x2={x} y2={gy + gh} stroke={BLUE} strokeWidth={1} />
          );
        })}

        {/* Quarter-hour ticks (small) on every row baseline */}
        {Array.from({ length: 24 }).map((_, h) =>
          [1, 2, 3].map((q) => {
            const x = gx + h * colW + (q * colW) / 4;
            const isHalf = q === 2;
            return ROWS.map((_, ri) => {
              const yBase = gy + ri * rowH + rowH;
              const len = isHalf ? 6 : 4;
              return (
                <line
                  key={`tick-${h}-${q}-${ri}`}
                  x1={x}
                  y1={yBase - len}
                  x2={x}
                  y2={yBase}
                  stroke={BLUE}
                  strokeWidth={0.5}
                />
              );
            });
          }),
        )}

        {/* Hour numbers (top) */}
        {Array.from({ length: 25 }).map((_, h) => {
          const x = gx + h * colW;
          const lbl = h === 0 || h === 24 ? "Midnight" : h === 12 ? "noon" : String(h % 12 === 0 ? 12 : h > 12 ? h - 12 : h);
          return (
            <text key={`tn${h}`} x={x} y={gy - 6} fontSize={9} fill={BLUE} textAnchor="middle" fontWeight={600}>
              {lbl}
            </text>
          );
        })}
        {/* Hour numbers (bottom) */}
        {Array.from({ length: 25 }).map((_, h) => {
          const x = gx + h * colW;
          const lbl = h === 0 || h === 24 ? "Midnight" : h === 12 ? "noon" : String(h % 12 === 0 ? 12 : h > 12 ? h - 12 : h);
          return (
            <text key={`bn${h}`} x={x} y={gy + gh + 14} fontSize={9} fill={BLUE} textAnchor="middle" fontWeight={600}>
              {lbl}
            </text>
          );
        })}

        {/* Row separators + labels */}
        {ROWS.map((r, i) => (
          <g key={r.key}>
            {i > 0 && (
              <line x1={gx} y1={gy + i * rowH} x2={gx + gw} y2={gy + i * rowH} stroke={BLUE} strokeWidth={1} />
            )}
            <text x={gx - 8} y={gy + i * rowH + rowH / 2 - 2} fontSize={10} fill="#0f172a" textAnchor="end" fontWeight={700}>
              {r.n}: {r.label.split("\n")[0]}
            </text>
            {r.label.includes("\n") && (
              <text x={gx - 8} y={gy + i * rowH + rowH / 2 + 10} fontSize={9} fill="#0f172a" textAnchor="end">
                {r.label.split("\n")[1]}
              </text>
            )}
          </g>
        ))}

        {/* Right-side HOURS / MINUTES columns */}
        <rect x={gx + gw} y={gy} width={70} height={gh} fill={FILL} stroke={BLUE} strokeWidth={1.5} />
        <rect x={gx + gw + 70} y={gy} width={50} height={gh} fill={FILL} stroke={BLUE} strokeWidth={1.5} />
        <text x={gx + gw + 35} y={gy - 6} fontSize={10} fill="#0f172a" textAnchor="middle" fontWeight={700}>HOURS</text>
        <text x={gx + gw + 95} y={gy - 16} fontSize={9} fill="#0f172a" textAnchor="middle" fontWeight={700}>MINUTES</text>
        <text x={gx + gw + 95} y={gy - 6} fontSize={8} fill="#0f172a" textAnchor="middle">TO BE 00,15,30,45</text>

        {ROWS.map((r, i) => {
          const mins = day.totals[r.key];
          const hh = Math.floor(mins / 60);
          const mm = mins % 60;
          // round minutes to nearest quarter for display
          const qm = Math.round(mm / 15) * 15;
          return (
            <g key={`tot-${r.key}`}>
              {i > 0 && (
                <>
                  <line x1={gx + gw} y1={gy + i * rowH} x2={gx + gw + 70} y2={gy + i * rowH} stroke={BLUE} />
                  <line x1={gx + gw + 70} y1={gy + i * rowH} x2={gx + gw + 120} y2={gy + i * rowH} stroke={BLUE} />
                </>
              )}
              <text x={gx + gw + 35} y={gy + i * rowH + rowH / 2 + 4} fontSize={14} fontWeight={700} fill="#0f172a" textAnchor="middle">
                {String(hh).padStart(2, "0")}
              </text>
              <text x={gx + gw + 95} y={gy + i * rowH + rowH / 2 + 4} fontSize={14} fontWeight={700} fill="#0f172a" textAnchor="middle">
                {String(qm).padStart(2, "0")}
              </text>
            </g>
          );
        })}

        {/* TOTAL HOURS label below grid */}
        <text x={gx + gw + 60} y={gy + gh + 28} fontSize={11} fontWeight={800} fill={BLUE} textAnchor="middle">
          TOTAL HOURS
        </text>
        <text x={gx + gw + 60} y={gy + gh + 44} fontSize={13} fontWeight={800} fill="#0f172a" textAnchor="middle">
          {fmtHM(day.totals.off + day.totals.sleeper + day.totals.driving + day.totals.onDuty)}
        </text>

        {/* ============ DUTY STATUS PATH ============ */}
        <path d={path.join(" ")} fill="none" stroke="#0f172a" strokeWidth={2.2} strokeLinejoin="miter" strokeLinecap="square" />

        {/* ============ REMARKS ============ */}
        <text x={32} y={gy + gh + 42} fontSize={13} fontWeight={800} fill={BLUE}>REMARKS</text>

        {remarks.map((r, i) => {
          const yLine = gy + gh;
          const yTickEnd = yLine + 24;
          return (
            <g key={`rk${i}`}>
              <line x1={r.x} y1={yLine} x2={r.x} y2={yTickEnd} stroke="#0f172a" strokeWidth={1.5} />
              <line x1={r.x} y1={yTickEnd} x2={r.x + 10} y2={yTickEnd} stroke="#0f172a" strokeWidth={1.5} />
              <text
                x={r.x + 12}
                y={yTickEnd + 2}
                fontSize={9}
                fill="#0f172a"
                fontWeight={600}
                transform={`rotate(35 ${r.x + 12} ${yTickEnd + 2})`}
              >
                {r.label}
              </text>
            </g>
          );
        })}

        {/* ============ SHIPPER / COMMODITY / LOAD ============ */}
        <g transform={`translate(0, ${gy + gh + 110})`}>
          <Label x={32} y={0} bold>SHIPPER:</Label>
          <line x1={92} y1={4} x2={340} y2={4} stroke={BLUE} />
          <text x={100} y={2} fontSize={12} fontWeight={700} fill="#0f172a">{shipper}</text>

          <Label x={360} y={0} bold>COMMODITY:</Label>
          <line x1={440} y1={4} x2={680} y2={4} stroke={BLUE} />
          <text x={448} y={2} fontSize={12} fontWeight={700} fill="#0f172a">{commodity}</text>

          <Label x={700} y={0} bold>LOAD NO.:</Label>
          <line x1={770} y1={4} x2={1000} y2={4} stroke={BLUE} />
          <text x={778} y={2} fontSize={12} fontWeight={700} fill="#0f172a">{loadNo}</text>

          <text x={W / 2} y={26} fontSize={9} fill={BLUE} textAnchor="middle">
            Each change of duty status must have a location in the &ldquo;remarks&rdquo; section. Use local time standard at home operating center.
          </text>
        </g>

        {/* ============ POST TRIP INSPECTION REPORT ============ */}
        <g transform={`translate(0, ${H - 70})`}>
          <rect x={20} y={-10} width={W - 40} height={68} fill={FILL} stroke={BLUE} strokeWidth={1.5} />
          <text x={W / 2} y={6} fontSize={12} fontWeight={800} fill={BLUE} textAnchor="middle">
            POST TRIP INSPECTION REPORT
          </text>
          <text x={W / 2} y={20} fontSize={8} fill={BLUE} textAnchor="middle" fontStyle="italic">
            (Equipment is checked in accordance with Schedule 1 of the National Safety Code Standard 13)
          </text>
          <text x={32} y={42} fontSize={10} fill="#0f172a">☐ I detect no defect in this motor vehicle likely to affect safe operation.</text>
          <text x={32} y={56} fontSize={10} fill="#0f172a">☐ I detect the following such defects — describe in detail.</text>
        </g>
      </svg>
    </div>
  );
}

/* ---------- helpers ---------- */

function Label({
  x,
  y,
  bold,
  children,
}: {
  x: number;
  y: number;
  bold?: boolean;
  children: React.ReactNode;
}) {
  return (
    <text x={x} y={y} fontSize={9} fill={BLUE} fontWeight={bold ? 700 : 400}>
      {children}
    </text>
  );
}

function BoxRow({ x, y, count, value }: { x: number; y: number; count: number; value: string }) {
  const size = 26;
  const chars = value.split("");
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => (
        <g key={i}>
          <rect x={x + i * size} y={y} width={size} height={size} fill={FILL} stroke={BLUE} strokeWidth={1.2} />
          <text
            x={x + i * size + size / 2}
            y={y + size / 2 + 6}
            fontSize={16}
            fontWeight={800}
            fill="#0f172a"
            textAnchor="middle"
          >
            {chars[i] ?? ""}
          </text>
        </g>
      ))}
    </g>
  );
}
