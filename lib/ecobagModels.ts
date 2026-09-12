export type EcobagShapeId = "horizontal" | "vertical";

export const ecobagShapes: { id: EcobagShapeId; label: string; detail: string }[] = [
  { id: "horizontal", label: "가로형", detail: "가로 42 x 35cm" },
  { id: "vertical", label: "세로형", detail: "가로 37 x 39cm" },
];

export type EcobagFabricId = "cotton10" | "cotton20";

export const ecobagFabrics: { id: EcobagFabricId; label: string; desc: string }[] = [
  { id: "cotton10", label: "면 10수", desc: "트윌(사선) 패턴으로 짜여진 단단한 느낌의 두꺼운 원단" },
  { id: "cotton20", label: "면 20수", desc: "평직이며 먼지 날림이 적고 통기성이 일부 있는, 10수보다 얇은 원단" },
];

export type EcobagAddonId = "strap" | "label" | "pocket" | "magnet";

export const ecobagAddons: {
  id: EcobagAddonId;
  label: string;
  price: number;
  desc: string;
  hasColor?: boolean;
}[] = [
  {
    id: "strap",
    label: "끈 커스텀 색상",
    price: 7000,
    desc: "선택하지 않으면 기본 화이트 원단 끈으로 제작돼요.",
    hasColor: true,
  },
  {
    id: "label",
    label: "라벨 커스텀 색상",
    price: 2000,
    desc: "Keepic 라벨의 색상을 원하시는 색으로 바꿔드려요.",
    hasColor: true,
  },
  {
    id: "pocket",
    label: "내부 포켓",
    price: 6000,
    desc: "가방 안쪽에 작은 포켓을 추가해요.",
  },
  {
    id: "magnet",
    label: "자석",
    price: 5000,
    desc: "가방 입구에 자석 여밈을 추가해요.",
  },
];

export const ECOBAG_BASE_PRICE = 35000;
