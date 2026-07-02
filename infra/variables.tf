variable "hcloud_token" {
  description = "Hetzner Cloud API token (provided via TF_VAR_hcloud_token)."
  type        = string
  sensitive   = true
}

variable "ssh_public_key_path" {
  description = "Path to the local SSH public key to install on the server."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}
