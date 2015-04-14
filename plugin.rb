# name: Awesome BBcodes
# about: BBCode tags with multiline support.
# version: 0.1
# authors: David Montoya
# url: https://github.com/rux-pizza/discourse-awesome-bbcodes

register_asset 'javascripts/jquery/details.js'
register_asset 'javascripts/jquery/spoiler.js'
register_asset 'javascripts/awesome-bbcodes.js', :server_side

# Typeface fonts
register_asset 'stylesheets/typefaces.css.scss'

# Details Stylesheet
register_asset 'stylesheets/details.scss'

# Include fonts in asset pipeline
plugin_path = File.expand_path(File.dirname(__FILE__))
Rails.configuration.assets.paths << File.join(plugin_path, "assets", "fonts")
Dir.glob("#{plugin_path}/assets/fonts/*").each do |path|
  Rails.configuration.assets.precompile << path
end


