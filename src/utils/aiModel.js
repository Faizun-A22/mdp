/**
 * aiModel.js
 * Pustaka Deep Learning lokal (Simple Neural Network) menggunakan Vanilla JavaScript.
 * Mendukung Feedforward, Backpropagation (Training), dan Reinforcement Self-Learning.
 */

// Fungsi Helper Matematika & Matriks Sederhana
export const Matrix = {
  create(rows, cols, initVal = 0) {
    const mat = [];
    for (let r = 0; r < rows; r++) {
      const row = [];
      for (let c = 0; c < cols; c++) {
        row.push(typeof initVal === 'function' ? initVal() : initVal);
      }
      mat.push(row);
    }
    return mat;
  },
  random(rows, cols) {
    // Inisialisasi bobot acak antara -1.0 dan 1.0
    return this.create(rows, cols, () => Math.random() * 2 - 1);
  },
  dot(a, b) {
    // Perkalian matriks a x b
    const rowsA = a.length, colsA = a[0].length;
    const rowsB = b.length, colsB = b[0].length;
    if (colsA !== rowsB) {
      throw new Error(`Matrix dot dimension mismatch: colsA(${colsA}) != rowsB(${rowsB})`);
    }
    const result = this.create(rowsA, colsB, 0);
    for (let r = 0; r < rowsA; r++) {
      for (let c = 0; c < colsB; c++) {
        let sum = 0;
        for (let i = 0; i < colsA; i++) {
          sum += a[r][i] * b[i][c];
        }
        result[r][c] = sum;
      }
    }
    return result;
  },
  add(a, b) {
    // Pertambahan matriks a + b
    const rows = a.length, cols = a[0].length;
    const result = this.create(rows, cols, 0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[r][c] = a[r][c] + b[r][c];
      }
    }
    return result;
  },
  subtract(a, b) {
    // Pengurangan matriks a - b
    const rows = a.length, cols = a[0].length;
    const result = this.create(rows, cols, 0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[r][c] = a[r][c] - b[r][c];
      }
    }
    return result;
  },
  transpose(a) {
    // Transpose matriks
    const rows = a.length, cols = a[0].length;
    const result = this.create(cols, rows, 0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[c][r] = a[r][c];
      }
    }
    return result;
  },
  map(a, fn) {
    // Memetakan fungsi fn ke setiap elemen matriks
    const rows = a.length, cols = a[0].length;
    const result = this.create(rows, cols, 0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[r][c] = fn(a[r][c], r, c);
      }
    }
    return result;
  },
  multiplyElements(a, b) {
    // Perkalian elemen-ke-elemen (Hadamard product)
    const rows = a.length, cols = a[0].length;
    const result = this.create(rows, cols, 0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[r][c] = a[r][c] * b[r][c];
      }
    }
    return result;
  },
  toArray(matrix) {
    // Mengubah matriks kolom 1D ke array flat
    return matrix.map(row => row[0]);
  },
  fromArray(arr) {
    // Mengubah array flat ke matriks kolom rows x 1
    return arr.map(val => [val]);
  }
};

// Fungsi Aktivasi Sigmoid & Turunannya
const sigmoid = x => 1 / (1 + Math.exp(-x));
const sigmoidDerivative = y => y * (1 - y); // y adalah output sigmoid(x)

export class SimpleNeuralNetwork {
  constructor(inputNodes, hiddenNodes, outputNodes, learningRate = 0.1) {
    this.inputNodes = inputNodes;
    this.hiddenNodes = hiddenNodes;
    this.outputNodes = outputNodes;
    this.learningRate = learningRate;

    // Bobot
    this.weights_ih = Matrix.random(this.hiddenNodes, this.inputNodes);
    this.weights_ho = Matrix.random(this.outputNodes, this.hiddenNodes);

    // Bias
    this.bias_h = Matrix.random(this.hiddenNodes, 1);
    this.bias_o = Matrix.random(this.outputNodes, 1);
  }

  // Feedforward
  predict(inputArray) {
    // Ubah input array ke matriks kolom
    const inputs = Matrix.fromArray(inputArray);

    // 1. Hitung output hidden layer
    const hidden_inputs = Matrix.dot(this.weights_ih, inputs);
    const hidden_outputs = Matrix.add(hidden_inputs, this.bias_h);
    // Terapkan fungsi aktivasi sigmoid
    const hidden_activated = Matrix.map(hidden_outputs, sigmoid);

    // 2. Hitung output output layer
    const output_inputs = Matrix.dot(this.weights_ho, hidden_activated);
    const output_outputs = Matrix.add(output_inputs, this.bias_o);
    const outputs_activated = Matrix.map(output_outputs, sigmoid);

    // Kembalikan dalam bentuk array 1D
    return Matrix.toArray(outputs_activated);
  }

  // Backpropagation (Training satu langkah)
  train(inputArray, targetArray) {
    const inputs = Matrix.fromArray(inputArray);
    const targets = Matrix.fromArray(targetArray);

    // --- FEEDFORWARD ---
    // Hidden layer outputs
    const hidden_inputs = Matrix.dot(this.weights_ih, inputs);
    const hidden_outputs = Matrix.add(hidden_inputs, this.bias_h);
    const hidden_activated = Matrix.map(hidden_outputs, sigmoid);

    // Output layer outputs
    const output_inputs = Matrix.dot(this.weights_ho, hidden_activated);
    const output_outputs = Matrix.add(output_inputs, this.bias_o);
    const outputs_activated = Matrix.map(output_outputs, sigmoid);

    // --- BACKPROPAGATION ---
    // 1. Hitung error output layer (Error = Target - Output)
    const output_errors = Matrix.subtract(targets, outputs_activated);

    // Hitung gradien output = Output * (1 - Output) * Error * LearningRate
    const output_gradients = Matrix.map(outputs_activated, sigmoidDerivative);
    const output_gradients_scaled = Matrix.multiplyElements(output_gradients, output_errors);
    const output_deltas = Matrix.map(output_gradients_scaled, val => val * this.learningRate);

    // Hitung perubahan bobot hidden -> output (D_W = Deltas x HiddenTransposed)
    const hidden_activated_T = Matrix.transpose(hidden_activated);
    const weights_ho_deltas = Matrix.dot(output_deltas, hidden_activated_T);

    // Perbarui bobot dan bias output layer
    this.weights_ho = Matrix.add(this.weights_ho, weights_ho_deltas);
    this.bias_o = Matrix.add(this.bias_o, output_deltas);

    // 2. Hitung error hidden layer (Error_H = Weights_HO_T x Output_Errors)
    const weights_ho_T = Matrix.transpose(this.weights_ho);
    const hidden_errors = Matrix.dot(weights_ho_T, output_errors);

    // Hitung gradien hidden = Hidden * (1 - Hidden) * Error_H * LearningRate
    const hidden_gradients = Matrix.map(hidden_activated, sigmoidDerivative);
    const hidden_gradients_scaled = Matrix.multiplyElements(hidden_gradients, hidden_errors);
    const hidden_deltas = Matrix.map(hidden_gradients_scaled, val => val * this.learningRate);

    // Hitung perubahan bobot input -> hidden (D_W_ih = HiddenDeltas x InputsTransposed)
    const inputs_T = Matrix.transpose(inputs);
    const weights_ih_deltas = Matrix.dot(hidden_deltas, inputs_T);

    // Perbarui bobot dan bias hidden layer
    this.weights_ih = Matrix.add(this.weights_ih, weights_ih_deltas);
    this.bias_h = Matrix.add(this.bias_h, hidden_deltas);

    // Hitung MSE (Mean Squared Error) untuk pelaporan loss
    let errorSum = 0;
    const errorsArray = Matrix.toArray(output_errors);
    errorsArray.forEach(err => {
      errorSum += err * err;
    });
    return errorSum / errorsArray.length;
  }
}

// ==========================================
// SIMULASI GENERATOR DATA DAN EVALUASI AI
// ==========================================

// Mock Dataset untuk Rekomendasi Pallet / Dead Stock & Optimasi Harga
// Features: [daysUnsold (normalised 0-100), profitMargin (normalised 0-50%), monthlyDemand (normalised 0-500)]
export const initialAdvisorDataset = [
  // Dead stock cases: high daysUnsold, low monthlyDemand
  { input: [35 / 100, 15 / 50, 10 / 500], target: [1, 0, 0] }, // Action: Promo/Bundling
  { input: [45 / 100, 20 / 50, 5 / 500], target: [1, 0, 0] },  // Action: Promo/Bundling
  
  // Normal cases: low daysUnsold, decent profitMargin, high demand
  { input: [5 / 100, 12 / 50, 250 / 500], target: [0, 1, 0] }, // Action: Keep Price / Reorder
  { input: [8 / 100, 18 / 50, 320 / 500], target: [0, 1, 0] }, // Action: Keep Price / Reorder

  // Price Optimization cases: low daysUnsold, low margin (< 10%), very high demand
  { input: [2 / 100, 5 / 50, 450 / 500], target: [0, 0, 1] },  // Action: Optimasi Harga (Naikkan Harga)
  { input: [3 / 100, 7 / 50, 400 / 500], target: [0, 0, 1] },  // Action: Optimasi Harga (Naikkan Harga)
  { input: [4 / 100, 4 / 50, 480 / 500], target: [0, 0, 1] }   // Action: Optimasi Harga (Naikkan Harga)
];

// Mock Dataset untuk Deteksi Kecurangan Kasir / Operator
// Features: [refundCount (0-10 dalam 30 mnt), scrapCount (0-15 pcs), nightShift (0 atau 1), amountVariance (0-100%)]
export const initialFraudDataset = [
  // Fraud cases: high refund count, high scrap count
  { input: [8 / 10, 5 / 15, 0, 80 / 100], target: [1] },  // High Risk (Fraud)
  { input: [9 / 10, 2 / 15, 1, 90 / 100], target: [1] },  // High Risk (Fraud)
  { input: [1 / 10, 12 / 15, 1, 75 / 100], target: [1] }, // High Risk (Fraud - Operator scrap manipulation)

  // Normal cases
  { input: [1 / 10, 0 / 15, 0, 10 / 100], target: [0] },  // Low Risk (Normal)
  { input: [2 / 10, 1 / 15, 0, 25 / 100], target: [0] },  // Low Risk (Normal)
  { input: [0 / 10, 2 / 15, 1, 15 / 100], target: [0] }   // Low Risk (Normal)
];

// Inisialisasi Global Model Sederhana
export const advisorModel = new SimpleNeuralNetwork(3, 5, 3, 0.15);
export const fraudModel = new SimpleNeuralNetwork(4, 6, 1, 0.2);

// Jalankan pre-training ringan agar model tidak benar-benar buta saat pertama kali dimuat
export function preTrainModels() {
  // Train advisorModel 500 kali
  for (let i = 0; i < 500; i++) {
    initialAdvisorDataset.forEach(data => {
      advisorModel.train(data.input, data.target);
    });
  }

  // Train fraudModel 500 kali
  for (let i = 0; i < 500; i++) {
    initialFraudDataset.forEach(data => {
      fraudModel.train(data.input, data.target);
    });
  }
}
