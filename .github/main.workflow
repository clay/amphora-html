workflow "Deploy to GitHub Pages" {
  on = "push"
  resolves = []
}

 action "Filter branch" {
  uses = "actions/bin/filter@master"
  args = "branch master"
}

 action "Build and push docs" {
  needs = ["Filter branch"]
  uses = "clay/docusaurus-github-action/build_deploy@master"
  secrets = ["DEPLOY_SSH_KEY"]
}
