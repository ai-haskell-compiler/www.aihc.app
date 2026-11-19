import Control.Concurrent
import Control.Monad

-- Run an action in a new green thread. The MVar receives its result.
spawn :: IO a -> IO (MVar a)
spawn action = do
  box <- newEmptyMVar
  _ <- forkIO (action >>= putMVar box)
  pure box

fib :: Int -> Integer
fib n = if n < 2 then toInteger n else fib (n - 1) + fib (n - 2)

main :: IO ()
main = do
  -- One thread for each Fibonacci number.
  boxes <- mapM (\n -> spawn (pure $! fib n)) [20 .. 25]
  results <- mapM takeMVar boxes
  print results

  -- Eight threads update one counter. The MVar is the lock.
  counter <- newMVar (0 :: Int)
  workers <- forM [1 .. 8] $ \n ->
    spawn (replicateM_ 1000 (modifyMVar_ counter (pure . (+ n))))
  mapM_ takeMVar workers
  total <- readMVar counter
  putStrLn ("8 threads, 8000 updates, total " ++ show total)
