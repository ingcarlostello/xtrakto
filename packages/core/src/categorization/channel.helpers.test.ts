import { describe, expect, it } from "vitest";
import { channelOf, payeeOf } from "./channel.helpers";

describe("channelOf", () => {
  it.each([
    ["PAGO PSE EMPRESA DE ENERGIA", "PSE"],
    ["Pago Pse Banco Ejemplo S", "PSE"],
    ["PAGO LLAVE Maria Lopez", "Llave Bre-B"],
    ["PAGO QR CAFE DEL PARQUE", "QR"],
    ["TRANSF QR JUAN PEREZ", "QR"],
    ["TRANSFERENCIAS A NEQUI", "Nequi"],
    ["TRANSFERENCIA DESDE NEQUI", "Nequi"],
    ["RETIRO CAJERO  ATM PLAZA CENTR", "Cajero"],
    ["COMPRA EN  MERCADO XYZ", "Débito"],
    ["PAGO SUC VIRT TC VISA PESOS", "Sucursal virtual"],
    ["TRANSFERENCIA CTA SUC VIRTUAL", "Sucursal virtual"],
    ["TRANSF A PEDRO GOMEZ R", "Transferencia"],
    ["TRANSF DE JUAN PEREZ", "Transferencia"],
    ["PAGO INTERBANC EMPRESA EJEMPLO", "Transferencia"],
    ["RETIRO CORRESPONSAL CB", "Corresponsal"],
    ["CONSIGNACION CORRESPONSAL CB", "Corresponsal"],
  ])("tags %j as %s", (description, label) => {
    expect(channelOf(description)?.labelEs).toBe(label);
  });

  it.each([
    ["ABONO INTERESES AHORROS"],
    ["INTERES INV VIRT *******0001"],
    ["APERTURA INV VIRTUAL SVP"],
    ["IMPTO GOBIERNO 4X1000"],
    // A fee for a withdrawal isn't the withdrawal.
    ["COMIS RETIRO CAJERO OTRA RED"],
    ["0"],
  ])("finds no channel in %j", (description) => {
    expect(channelOf(description)).toBeNull();
  });
});

describe("payeeOf", () => {
  it.each([
    ["PAGO PSE Empresa de Energía", ["EMPRESA", "DE", "ENERGIA"], 2],
    ["TRANSF A  GAS NATURAL CIUDAD", ["GAS", "NATURAL", "CIUDAD"], 2],
    ["PAGO SUC VIRT TC MASTER PESOS", ["TC", "MASTER", "PESOS"], 3],
    ["TRANSFERENCIAS A NEQUI", [], 3],
    ["RETIRO CORRESPONSAL CB", ["RETIRO", "CORRESPONSAL", "CB"], 0],
    ["APERTURA INV VIRTUAL SVP", ["APERTURA", "INV", "VIRTUAL", "SVP"], 0],
  ])(
    "reads who %j names after its channel",
    (description, words, channelWords) => {
      expect(payeeOf(description)).toEqual({ words, channelWords });
    },
  );
});
