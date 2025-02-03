import { Calculator } from '../../../utils/calculator';

describe('Calculator', () => {
  let calculator: Calculator;

  beforeEach(() => {
    calculator = new Calculator();
  });

  test('adds two numbers correctly', () => {
    expect(calculator.add(2, 3)).toBe(5);
  });

  test('throws error for invalid inputs', () => {
    expect(() => calculator.divide(1, 0)).toThrow('Division by zero');
  });
}); 