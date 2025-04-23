// Initialize counter
let count = 0;

// Function to increment counter
function increment() {
    count += 1;
    return count;
}

// Function to decrement counter
function decrement() {
    count -= 1;
    return count;
}

// Function to reset counter
function reset() {
    count = 0;
    return count;
}

// Function to get current count
function getCount() {
    return count;
}

// Example usage:
// console.log(increment()); // 1
// console.log(increment()); // 2
// console.log(decrement()); // 1
// console.log(reset()); // 0