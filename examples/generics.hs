{-# LANGUAGE DefaultSignatures, DeriveAnyClass, DeriveGeneric #-}
{-# LANGUAGE FlexibleContexts, TypeOperators #-}
import Data.List (intercalate)
import GHC.Generics

-- Turn a value into JSON. The default works for every record type.
class ToJSON a where
  toJSON :: a -> String
  default toJSON :: (Generic a, Fields (Rep a)) => a -> String
  toJSON x = "{" ++ intercalate ", " (fields (from x)) ++ "}"

instance ToJSON Int where toJSON = show
instance ToJSON Bool where toJSON b = if b then "true" else "false"
instance {-# OVERLAPPING #-} ToJSON String where toJSON = show
instance ToJSON a => ToJSON [a] where
  toJSON xs = "[" ++ intercalate ", " (map toJSON xs) ++ "]"
instance ToJSON a => ToJSON (Maybe a) where toJSON = maybe "null" toJSON

-- Walk the generic representation of a record and collect its fields.
class Fields f where fields :: f p -> [String]
instance Fields f => Fields (D1 c f) where fields (M1 x) = fields x
instance Fields f => Fields (C1 c f) where fields (M1 x) = fields x
instance (Fields f, Fields g) => Fields (f :*: g) where
  fields (x :*: y) = fields x ++ fields y
instance (Selector s, ToJSON a) => Fields (S1 s (K1 i a)) where
  fields field@(M1 (K1 x)) = [show (selName field) ++ ": " ++ toJSON x]

-- No encoder is written for these types. The compiler derives it.
data Target = Target { triple :: String, bits :: Int }
  deriving (Generic, ToJSON)

data Compiler = Compiler
  { name :: String, selfHosting :: Bool, targets :: [Target]
  , successor :: Maybe String }
  deriving (Generic, ToJSON)

main :: IO ()
main = putStrLn (toJSON aihc)
  where
    aihc = Compiler "AIHC" True
      [Target "x86_64-linux" 64, Target "aarch64-darwin" 64, Target "wasm32" 32]
      Nothing
