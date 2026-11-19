-- An infinite list of primes. Laziness computes only the part that is used.
primes :: [Int]
primes = sieve [2 ..]
  where
    sieve (p : xs) = p : sieve [x | x <- xs, x `mod` p /= 0]
    sieve [] = []

-- The Collatz sequence from n, up to the first 1.
collatz :: Int -> [Int]
collatz = takeWhile (/= 1) . iterate step
  where
    step n = if even n then n `div` 2 else 3 * n + 1

main :: IO ()
main = do
  print (take 10 primes)
  print (takeWhile (< 200) (map (^ 2) primes))
  putStrLn ("collatz 27 takes " ++ show (length (collatz 27)) ++ " steps")
