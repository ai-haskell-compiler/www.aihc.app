{-# LANGUAGE DataKinds, MagicHash, PolyKinds, StandaloneKindSignatures #-}
{-# LANGUAGE UnboxedSums, UnboxedTuples, UnliftedDatatypes #-}
import GHC.Exts

-- An unboxed sum: a Maybe Int that never touches the heap.
type Quotient = (# (# #) | Int# #)

divide :: Int# -> Int# -> Quotient
divide _ 0# = (# (# #) | #)
divide n d = (# | quotInt# n d #)

-- An unlifted data type: a list that is never a thunk.
type Strict :: UnliftedType
data Strict = Nil | Cons Int# Strict

-- The result can have any runtime representation: r is a variable.
orElse :: forall r (b :: TYPE r). Quotient -> (Int# -> b) -> ((# #) -> b) -> b
orElse (# | n #) some _ = some n
orElse (# (# #) | #) _ none = none (# #)

-- A class over every representation, not only over boxed values.
type Render :: forall (r :: RuntimeRep). TYPE r -> Constraint
class Render (a :: TYPE r) where render :: a -> String
instance Render Int# where render n = show (I# n) ++ "#"
instance Render Double# where render x = show (D# x) ++ "##"
instance Render Quotient where
  render q = orElse q (\n -> "(# | " ++ render n ++ " #)") (\_ -> "(# (# #) | #)")
instance Render (# Int#, Double# #) where
  render (# n, x #) = "(# " ++ render n ++ ", " ++ render x ++ " #)"
instance Render Strict where
  render Nil = "Nil"
  render (Cons n rest) = render n ++ " : " ++ render rest

main :: IO ()
main = do
  putStrLn (render (divide 84# 2#))
  putStrLn (render (divide 1# 0#))
  -- One function, three representations: registers, a double, a pointer.
  putStrLn (render (orElse (divide 9# 2#) (\n -> (# n, sqrtDouble# 2.0## #))
                                          (\_ -> (# 0#, 0.0## #))))
  putStrLn (render (orElse (divide 9# 2#) int2Double# (\_ -> 0.0##)))
  putStrLn (render (orElse (divide 9# 0#) (\n -> Cons n Nil)
                                          (\_ -> Cons 1# (Cons 2# Nil))))
