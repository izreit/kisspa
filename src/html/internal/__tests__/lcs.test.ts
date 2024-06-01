import { lcs } from "../lcs";

function charLcs(a: string, b: string): string {
  return lcs(a.split(""), b.split("")).join("");
}

function testcase(a: string, b: string, expected: string): void {
  it(`finds LCS for ${a}/${b} is ${expected}`, () => {
    expect(charLcs(a, b)).toBe(expected);
  });
}

describe("lcs", () => {
  testcase("1234", "abcd", "");
  testcase("1", "1", "1");
  testcase("2", "1", "");
  testcase("12", "312", "12");
  testcase("123", "12", "12");
  testcase("abcdef", "bdaecf", "bdef");
  testcase("31542798", "0123456789abc", "3579");
  testcase("abcdefghijkl", "lihgfedcbjak", "bjk");
  testcase("1234567890abcdef", "12345a67890bcedf", "1234567890bcdf");
});
