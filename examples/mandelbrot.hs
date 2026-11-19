-- The Mandelbrot set. Change the size or the center and press Run.
width, height, limit :: Int
width = 40
height = 17
limit = 60

-- How many steps the point c takes to leave the circle of radius 2.
escape :: Double -> Double -> Int
escape cr ci = go 0 0 0
  where
    go :: Double -> Double -> Int -> Int
    go x y n
      | n == limit || x * x + y * y > 4 = n
      | otherwise = go (x * x - y * y + cr) (2 * x * y + ci) (n + 1)

-- A point that stays is inside the set. Outside, the steps make bands.
shade :: Int -> Char
shade n
  | n == limit = '#'
  | otherwise = "  ..,::;=+*%" !! min n 11

-- Map the column i and the row j to a point of the plane.
pixel :: Int -> Int -> Char
pixel j i = shade (escape (along i width (-2.1) 0.9) (along j height (-1.2) 1.2))
  where
    along k size low high =
      low + (high - low) * fromIntegral k / fromIntegral (size - 1)

main :: IO ()
main = mapM_ putStrLn [[pixel j i | i <- [0 .. width - 1]] | j <- [0 .. height - 1]]
