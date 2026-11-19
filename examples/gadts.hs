{-# LANGUAGE GADTs, LambdaCase #-}

-- An expression whose type says what it evaluates to.
data Expr a where
  Lit  :: Int -> Expr Int
  Add  :: Expr Int -> Expr Int -> Expr Int
  Mul  :: Expr Int -> Expr Int -> Expr Int
  Less :: Expr Int -> Expr Int -> Expr Bool
  If   :: Expr Bool -> Expr a -> Expr a -> Expr a

-- No tags to check and no failure case: the types rule them out.
eval :: Expr a -> a
eval = \case
  Lit n    -> n
  Add a b  -> eval a + eval b
  Mul a b  -> eval a * eval b
  Less a b -> eval a < eval b
  If c t e -> if eval c then eval t else eval e

render :: Expr a -> String
render = \case
  Lit n    -> show n
  Add a b  -> "(" ++ render a ++ " + " ++ render b ++ ")"
  Mul a b  -> "(" ++ render a ++ " * " ++ render b ++ ")"
  Less a b -> render a ++ " < " ++ render b
  If c t e -> "if " ++ render c ++ " then " ++ render t ++ " else " ++ render e

main :: IO ()
main = do
  let expr = If (Less (Lit 2) (Lit 3)) (Mul (Lit 6) (Add (Lit 3) (Lit 4))) (Lit 0)
  putStrLn (render expr)
  print (eval expr)
